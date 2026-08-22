"use client";

import Link from "next/link";

import type { NavigationDestinationRenderer } from "@/components/layout/AppNavigationVisual";
import type { HomeOverviewView } from "@/types/home";

import { HomeNowPanelView, HomeSecondaryRailView } from "./HomeOverviewPanelsView";

const renderDestination: NavigationDestinationRenderer = ({ href, label, className, active, children, onNavigate }) => (
  <Link href={href} aria-label={label} aria-current={active ? "page" : undefined} className={className} onClick={onNavigate}>{children}</Link>
);

export function HomeNowPanel({ overview }: { overview: HomeOverviewView }) {
  return <HomeNowPanelView overview={overview} renderDestination={renderDestination} />;
}

export function HomeSecondaryRail({ overview }: { overview: HomeOverviewView }) {
  return <HomeSecondaryRailView overview={overview} renderDestination={renderDestination} />;
}
