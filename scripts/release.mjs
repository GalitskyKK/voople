import { spawnSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import process from "node:process";

const FILES = [
  "desktop/package.json",
  "desktop/package-lock.json",
  "desktop/src-tauri/Cargo.toml",
  "desktop/src-tauri/Cargo.lock",
  "desktop/src-tauri/tauri.conf.json",
  "CHANGELOG.md",
];

const originals = new Map(
  await Promise.all(
    FILES.map(async (file) => [
      file,
      await readFile(file, "utf8"),
    ]),
  ),
);

const prompt = createInterface({
  input: process.stdin,
  output: process.stdout,
});

let createdTag = null;
let originalHead = null;
let releaseCommit = null;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
    shell: false,
    env: options.env ?? process.env,
  });

  if (result.status !== 0) {
    const stderr = (result.stderr ?? "").trim();
    const suffix = stderr ? `\n${stderr}` : "";

    throw new Error(
      `${command} ${args.join(" ")} failed${suffix}`,
    );
  }

  return (result.stdout ?? "").trim();
}

function runOptional(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    stdio: "inherit",
    shell: false,
    env: options.env ?? process.env,
  });

  if (result.status === 0) return true;

  process.stdout.write(
    `\nOptional check skipped after failure: ${command} ${args.join(" ")}\n`,
  );

  return false;
}

function git(...args) {
  return run("git", args, { capture: true });
}

function parseVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);

  if (!match) {
    throw new Error(`Unsupported version: ${version}`);
  }

  return match.slice(1).map(Number);
}

function bump(version, kind) {
  const [major, minor, patch] = parseVersion(version);

  if (kind === "major") {
    return `${major + 1}.0.0`;
  }

  if (kind === "minor") {
    return `${major}.${minor + 1}.0`;
  }

  return `${major}.${minor}.${patch + 1}`;
}

function replaceRequired(
  content,
  pattern,
  replacement,
  label,
) {
  if (!pattern.test(content)) {
    throw new Error(
      `Failed to locate version in ${label}`,
    );
  }

  pattern.lastIndex = 0;

  const next = content.replace(
    pattern,
    replacement,
  );

  if (next === content) {
    throw new Error(
      `Failed to update version in ${label}`,
    );
  }

  return next;
}

function readRequiredMatch(
  content,
  pattern,
  label,
) {
  const match = pattern.exec(content);

  if (!match) {
    throw new Error(
      `Failed to read version from ${label}`,
    );
  }

  return match[1];
}

async function verifyReleaseVersion(
  expectedVersion,
) {
  const desktopPackage = JSON.parse(
    await readFile(
      "desktop/package.json",
      "utf8",
    ),
  );

  const desktopLock = JSON.parse(
    await readFile(
      "desktop/package-lock.json",
      "utf8",
    ),
  );

  const tauriConfig = JSON.parse(
    await readFile(
      "desktop/src-tauri/tauri.conf.json",
      "utf8",
    ),
  );

  const cargoToml = await readFile(
    "desktop/src-tauri/Cargo.toml",
    "utf8",
  );

  const cargoLock = await readFile(
    "desktop/src-tauri/Cargo.lock",
    "utf8",
  );

  const cargoTomlVersion =
    readRequiredMatch(
      cargoToml,
      /\[package\][\s\S]*?^version\s*=\s*"([^"]+)"/m,
      "desktop/src-tauri/Cargo.toml",
    );

  const cargoLockVersion =
    readRequiredMatch(
      cargoLock,
      /\[\[package\]\]\r?\nname\s*=\s*"voople-desktop"\r?\nversion\s*=\s*"([^"]+)"/,
      "desktop/src-tauri/Cargo.lock",
    );

  const versions = [
    [
      "desktop/package.json",
      desktopPackage.version,
    ],
    [
      "desktop/package-lock.json",
      desktopLock.version,
    ],
    [
      'desktop/package-lock.json packages[""]',
      desktopLock.packages?.[""]?.version,
    ],
    [
      "desktop/src-tauri/tauri.conf.json",
      tauriConfig.version,
    ],
    [
      "desktop/src-tauri/Cargo.toml",
      cargoTomlVersion,
    ],
    [
      "desktop/src-tauri/Cargo.lock",
      cargoLockVersion,
    ],
  ];

  const mismatches = versions.filter(
    ([, version]) =>
      version !== expectedVersion,
  );

  if (mismatches.length) {
    const details = mismatches
      .map(
        ([file, version]) =>
          `  ${file}: ${String(version)} (expected ${expectedVersion})`,
      )
      .join("\n");

    throw new Error(
      `Desktop release versions are out of sync:\n${details}`,
    );
  }

  process.stdout.write(
    `Desktop version sync verified: ${expectedVersion}\n`,
  );
}

function verifyCargoLock() {
  run(
    "cargo",
    [
      "metadata",
      "--manifest-path",
      "desktop/src-tauri/Cargo.toml",
      "--locked",
      "--format-version",
      "1",
      "--no-deps",
    ],
    {
      capture: true,
    },
  );

  process.stdout.write(
    "Cargo manifest/lock consistency verified.\n",
  );
}

async function restoreFiles() {
  await Promise.all(
    [...originals].map(
      ([file, content]) =>
        writeFile(
          file,
          content,
          "utf8",
        ),
    ),
  );
}

async function main() {
  if (
    git("branch", "--show-current") !==
    "master"
  ) {
    throw new Error(
      "Release must run from master",
    );
  }

  if (git("status", "--porcelain")) {
    throw new Error(
      "Release requires a clean working tree",
    );
  }

  run("git", [
    "fetch",
    "origin",
    "master",
    "--tags",
  ]);

  if (
    git("rev-parse", "HEAD") !==
    git(
      "rev-parse",
      "origin/master",
    )
  ) {
    throw new Error(
      "master must be synchronized with origin/master",
    );
  }

  originalHead = git(
    "rev-parse",
    "HEAD",
  );

  const desktopPackage =
    JSON.parse(
      originals.get(
        "desktop/package.json",
      ),
    );

  const currentVersion =
    desktopPackage.version;

  const bumpKind =
    (
      await prompt.question(
        `Version bump [patch/minor/major] (patch, current ${currentVersion}): `,
      )
    ).trim() || "patch";

  if (
    ![
      "patch",
      "minor",
      "major",
    ].includes(bumpKind)
  ) {
    throw new Error(
      "Choose patch, minor or major",
    );
  }

  const suggested = bump(
    currentVersion,
    bumpKind,
  );

  const nextVersion =
    (
      await prompt.question(
        `Version (${suggested}): `,
      )
    ).trim() || suggested;

  parseVersion(nextVersion);

  if (
    nextVersion === currentVersion
  ) {
    throw new Error(
      `Next version must differ from current version ${currentVersion}`,
    );
  }

  const tag =
    `desktop-v${nextVersion}`;

  if (
    git(
      "tag",
      "--list",
      tag,
    )
  ) {
    throw new Error(
      `${tag} already exists`,
    );
  }

  const previousTag = git(
    "tag",
    "--list",
    "desktop-v*",
    "--sort=-version:refname",
  )
    .split(/\r?\n/)
    .filter(Boolean)[0];

  const commitRange =
    previousTag
      ? `${previousTag}..HEAD`
      : "HEAD";

  const commits = git(
    "log",
    "--pretty=format:%s",
    commitRange,
  )
    .split(/\r?\n/)
    .filter(Boolean);

  const defaultTitle =
    `Voople Desktop ${nextVersion}`;

  const title =
    (
      await prompt.question(
        `Release title (${defaultTitle}): `,
      )
    ).trim() || defaultTitle;

  process.stdout.write(
    "Напишите от 1 до 5 коротких заметок для пользователей. Пустая строка завершает ввод.\n",
  );

  const notes = [];

  while (notes.length < 5) {
    const line =
      (
        await prompt.question("- ")
      ).trim();

    if (!line) break;

    notes.push(
      line.replace(/^-\s*/, ""),
    );
  }

  const releaseNotes = notes;

  if (!releaseNotes.length) {
    throw new Error(
      "Добавьте хотя бы одну понятную пользователю заметку о релизе",
    );
  }

  // -----------------------------
  // desktop/package.json
  // -----------------------------

  desktopPackage.version =
    nextVersion;

  await writeFile(
    "desktop/package.json",
    `${JSON.stringify(
      desktopPackage,
      null,
      2,
    )}\n`,
    "utf8",
  );

  // -----------------------------
  // desktop/package-lock.json
  // -----------------------------

  const packageLock =
    JSON.parse(
      originals.get(
        "desktop/package-lock.json",
      ),
    );

  packageLock.version =
    nextVersion;

  if (
    !packageLock.packages?.[""]
  ) {
    throw new Error(
      'desktop/package-lock.json does not contain packages[""]',
    );
  }

  packageLock.packages[
    ""
  ].version = nextVersion;

  await writeFile(
    "desktop/package-lock.json",
    `${JSON.stringify(
      packageLock,
      null,
      2,
    )}\n`,
    "utf8",
  );

  // -----------------------------
  // tauri.conf.json
  // -----------------------------

  const tauriConfig =
    JSON.parse(
      originals.get(
        "desktop/src-tauri/tauri.conf.json",
      ),
    );

  tauriConfig.version =
    nextVersion;

  await writeFile(
    "desktop/src-tauri/tauri.conf.json",
    `${JSON.stringify(
      tauriConfig,
      null,
      2,
    )}\n`,
    "utf8",
  );

  // -----------------------------
  // Cargo.toml
  // -----------------------------

  const nextCargoToml =
    replaceRequired(
      originals.get(
        "desktop/src-tauri/Cargo.toml",
      ),
      /(\[package\][\s\S]*?^version\s*=\s*")[^"]+(")/m,
      `$1${nextVersion}$2`,
      "desktop/src-tauri/Cargo.toml",
    );

  await writeFile(
    "desktop/src-tauri/Cargo.toml",
    nextCargoToml,
    "utf8",
  );

  // -----------------------------
  // Cargo.lock
  //
  // Работает и с LF, и с CRLF.
  // Если package block не найден,
  // release падает сразу.
  // -----------------------------

  const nextCargoLock =
    replaceRequired(
      originals.get(
        "desktop/src-tauri/Cargo.lock",
      ),
      /(\[\[package\]\]\r?\nname\s*=\s*"voople-desktop"\r?\nversion\s*=\s*")[^"]+(")/,
      `$1${nextVersion}$2`,
      "desktop/src-tauri/Cargo.lock",
    );

  await writeFile(
    "desktop/src-tauri/Cargo.lock",
    nextCargoLock,
    "utf8",
  );

  // -----------------------------
  // Проверяем версии ДО дорогих тестов.
  // -----------------------------

  await verifyReleaseVersion(
    nextVersion,
  );

  verifyCargoLock();

  // -----------------------------
  // CHANGELOG
  // -----------------------------

  const date =
    new Date()
      .toISOString()
      .slice(0, 10);

  const section =
    `## [${nextVersion}] - ${date}\n\n` +
    `### ${title}\n\n` +
    `${releaseNotes
      .map(
        (note) => `- ${note}`,
      )
      .join("\n")}\n\n`;

  const changelog =
    originals.get("CHANGELOG.md");

  const nextChangelog =
    changelog.replace(
      /^# Changelog\r?\n/,
      `# Changelog\n\n${section}`,
    );

  if (
    nextChangelog === changelog
  ) {
    throw new Error(
      "Failed to update CHANGELOG.md",
    );
  }

  await writeFile(
    "CHANGELOG.md",
    nextChangelog,
    "utf8",
  );

  // Проверяем whitespace до долгих билдов.
  run("git", [
    "diff",
    "--check",
  ]);

  // -----------------------------
  // Проверки приложения
  // -----------------------------

  const checks = [
    {
      args: [
        "scripts/check-architecture.mjs",
      ],
    },

    {
      args: [
        "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
        "--experimental-strip-types",
        "--test",
        "tests/*.test.mjs",
      ],
    },

    {
      args: [
        "node_modules/eslint/bin/eslint.js",
        ".",
      ],
    },

    {
      args: [
        "node_modules/typescript/bin/tsc",
        "--noEmit",
      ],
    },

    {
      args: [
        "node_modules/next/dist/bin/next",
        "build",
      ],
    },

    {
      args: [
        "scripts/check-migration-readiness.mjs",
      ],
    },

    {
      args: [
        "node_modules/typescript/bin/tsc",
        "--noEmit",
      ],
      cwd: "desktop",
    },

    {
      args: [
        "node_modules/vite/bin/vite.js",
        "build",
      ],
      cwd: "desktop",
    },

    {
      args: [
        "node_modules/@playwright/test/cli.js",
        "test",
      ],
      env: {
        ...process.env,
        VOOPLE_RELEASE_E2E:
          "1",
      },
    },
  ];

  for (const check of checks) {
    run(
      check.command ??
        process.execPath,
      check.args,
      {
        cwd: check.cwd,
        env: check.env,
      },
    );
  }

  // -----------------------------
  // Опциональная локальная
  // native screen-share проверка.
  //
  // На твоём текущем ПК она
  // обычно выключена.
  // -----------------------------

  if (
    process.platform ===
      "win32" &&
    process.env
      .VERIFY_NATIVE_AUDIO === "1"
  ) {
    process.stdout.write(
      "\nRunning optional native screen-share worker checks locally.\n",
    );

    const target =
      "x86_64-pc-windows-msvc";

    const workerManifest =
      "desktop/screen-share-worker/Cargo.toml";

    const workerBuilt =
      runOptional(
        "cargo",
        [
          "build",
          "--manifest-path",
          workerManifest,
          "--locked",
          "--release",
          "--target",
          target,
        ],
      );

    const workerTested =
      workerBuilt &&
      runOptional(
        "cargo",
        [
          "test",
          "--manifest-path",
          workerManifest,
          "--locked",
          "--release",
          "--target",
          target,
        ],
      );

    const tauriChecked =
      workerBuilt &&
      runOptional(
        "cargo",
        [
          "check",
          "--manifest-path",
          "desktop/src-tauri/Cargo.toml",
          "--locked",
          "--release",
          "--features",
          "process-audio-publisher",
          "--target",
          target,
        ],
      );

    if (
      !workerBuilt ||
      !workerTested ||
      !tauriChecked
    ) {
      process.stdout.write(
        "\nNative screen-share checks did not pass locally. " +
          "This does not block release creation; GitHub Actions performs " +
          "the authoritative Windows native build and can fall back to " +
          "the non-native installer.\n",
      );
    }
  } else {
    process.stdout.write(
      "Native installer checks are delegated to GitHub Actions.\n",
    );
  }

  // -----------------------------
  // Проверяем версии повторно:
  // никакой check/build не должен был
  // изменить release manifests.
  // -----------------------------

  await verifyReleaseVersion(
    nextVersion,
  );

  verifyCargoLock();

  process.stdout.write(
    `\nDry run\n` +
      `  ${currentVersion} -> ${nextVersion}\n` +
      `  tag: ${tag}\n` +
      `  release notes: ${releaseNotes.length}\n` +
      `  technical commits: ${commits.length}\n`,
  );

  run("git", [
    "diff",
    "--stat",
  ]);

  const confirm =
    (
      await prompt.question(
        "Create release commit, tag and atomically push? [y/N]: ",
      )
    )
      .trim()
      .toLowerCase();

  if (
    confirm !== "y" &&
    confirm !== "yes"
  ) {
    await restoreFiles();

    process.stdout.write(
      "Release cancelled; files restored.\n",
    );

    return;
  }

  // -----------------------------
  // Последняя проверка
  // непосредственно перед commit.
  // -----------------------------

  await verifyReleaseVersion(
    nextVersion,
  );

  verifyCargoLock();

  run("git", [
    "add",
    ...FILES,
  ]);

  run("git", [
    "diff",
    "--cached",
    "--check",
  ]);

  run("git", [
    "commit",
    "-m",
    `release: desktop ${nextVersion}`,
  ]);

  releaseCommit = git(
    "rev-parse",
    "HEAD",
  );

  run("git", [
    "tag",
    "-a",
    tag,
    "-m",
    title,
  ]);

  createdTag = tag;

  run("git", [
    "push",
    "--atomic",
    "origin",
    "master",
    tag,
  ]);

  process.stdout.write(
    `Released ${tag}. GitHub Actions will build and publish artifacts.\n`,
  );
}

try {
  await main();
} catch (error) {
  if (createdTag) {
    spawnSync(
      "git",
      [
        "tag",
        "-d",
        createdTag,
      ],
      {
        stdio: "ignore",
      },
    );
  }

  if (
    releaseCommit &&
    originalHead
  ) {
    spawnSync(
      "git",
      [
        "update-ref",
        "refs/heads/master",
        originalHead,
        releaseCommit,
      ],
      {
        stdio: "ignore",
      },
    );

    spawnSync(
      "git",
      [
        "read-tree",
        originalHead,
      ],
      {
        stdio: "ignore",
      },
    );
  }

  await restoreFiles();

  process.stderr.write(
    `${
      error instanceof Error
        ? error.message
        : String(error)
    }\nNo release tag was published.\n`,
  );

  process.exitCode = 1;
} finally {
  prompt.close();
}
