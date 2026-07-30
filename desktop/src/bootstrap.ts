function errorMessage(value: unknown) {
  if (value instanceof Error) return value.message;
  if (typeof value === "string") return value;
  return "Неизвестная ошибка запуска";
}

function showBootError(value: unknown) {
  const root = document.getElementById("root");
  if (!root || root.childElementCount > 0) return;

  const page = document.createElement("main");
  page.className = "desktop-boot-error";

  const card = document.createElement("section");
  const title = document.createElement("h1");
  const description = document.createElement("p");
  const details = document.createElement("code");

  title.textContent = "Voople не удалось запустить";
  description.textContent =
    "Перезапустите приложение. Если ошибка повторяется, приложите этот текст к отчёту.";
  details.textContent = errorMessage(value);

  card.append(title, description, details);
  page.append(card);
  root.replaceChildren(page);
}

window.addEventListener("error", (event) => {
  showBootError(event.error ?? event.message);
});
window.addEventListener("unhandledrejection", (event) => {
  showBootError(event.reason);
});

void import("./main").catch(showBootError);
