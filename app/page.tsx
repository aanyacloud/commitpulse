import type { Metadata } from 'next';
import LandingPageClient from './components/LandingPageClient';
import Link from 'next/link';
import { useRef, useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';

import {
  Flame,
  Trophy,
  GitCommit,
  Folder,
  Search,
  Loader2,
  Sparkles,
  Copy,
  ExternalLink,
  X,
} from 'lucide-react';

import useLocalStorage from '@/hooks/useLocalStorage';

import { CommitPulseLogo } from '@/components/commitpulse-logo';
import { CustomizeCTA } from './components/CustomizeCTA';
import { useRecentSearches } from '@/hooks/useRecentSearches';
import { useDebounce } from '@/hooks/useDebounce';
import { Footer } from '@/app/components/Footer';
// @ts-ignore
import { InteractiveViewer } from '@/components/interactive-viewer/InteractiveViewer';

import { FeatureCard, FeatureCardsSection } from '@/components/FeatureCards';
import { DiscordButton } from '@/components/DiscordButton';
import { WallOfLove } from '@/components/WallOfLove';
import { validateGitHubUsername } from '@/lib/validations';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://commitpulse.vercel.app'),
  title: 'CommitPulse | 3D Isometric GitHub Contribution Graph',
  description:
    'Transform your GitHub contribution history into a cinematic, 3D isometric SVG monolith. Drop it into your README and visualize your developer rhythm with real-time accuracy.',
  keywords: [
    'GitHub',
    'contribution graph',
    'isometric',
    '3D SVG',
    'GitHub stats',
    'README widget',
    'developer portfolio',
    'CommitPulse',
    'streak badge',
    'GitHub badge generator',
  ],
  openGraph: {
    title: 'CommitPulse | 3D Isometric GitHub Contribution Graph',
    description:
      'Generate a cinematic, isometric 3D SVG of your GitHub contributions for your README. Visualize your grind.',
    url: 'https://commitpulse.vercel.app/',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CommitPulse | Elevate Your GitHub README',
    description:
      'Generate a cinematic, isometric 3D SVG of your GitHub contributions for your README.',
  },
};

const Icons = {
  Flame,
  Trophy,
  GitCommit,
  Folder,
  Search,
  Loader2,
  Sparkles,
  Copy,
  ExternalLink,
  X,
  Github: () => (
    <svg height="24" width="24" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  ),
  Zap: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M13 2 L3 14 L12 14 L11 22 L21 10 L12 10 L13 2 Z" />
    </svg>
  ),
  Box: () => <CommitPulseLogo className="h-6 w-6" />,
  Check: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#10b981"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
};

export default function LandingPage() {
  const [svgState, setSvgState] = useState<'idle' | 'loading' | 'loaded' | 'success' | 'error'>('idle');
  const [svgContent, setSvgContent] = useState<string>('');
  
  const getDisplayUsername = (name: string) => {
    if (name.includes('github.com/')) {
      const parts = name.split('github.com/');
      if (parts[1]) {
        const pathParts = parts[1].split('?')[0].split('/');
        const userPart = pathParts.find((p) => p.trim().length > 0);
        if (userPart) return userPart;
      }
    }
    return name;
  };

  const [username, setUsername] = useLocalStorage('commitpulse:last-user', '');
  const [instantUsername, setInstantUsername] = useState('');
  const [copied, setCopied] = useState(false);

  const resetCopiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollToGuideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [badgeResult, setBadgeResult] = useState<{
    username: string;
    status: 'loaded' | 'error';
  } | null>(null);
  
  const guideRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const { searches, addSearch, clearSearches, removeSearch } = useRecentSearches();
  const [mounted, setMounted] = useState(false);

  // States for user profile details loading
  interface UserDetails {
    public_repos?: number;
    stats?: {
      currentStreak?: number;
      longestStreak?: number;
      totalContributions?: number;
    };
  }
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [userDetailsLoading, setUserDetailsLoading] = useState(false);
  const [userDetailsError, setUserDetailsError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useGSAP(
    () => {
      if (!heroRef.current) return;

      gsap.to('.hero-text', {
        y: 0,
        opacity: 1,
        duration: 1.2,
        ease: 'expo.out',
        delay: 0.15,
      });

      gsap.to('.contribution-text', {
        backgroundPosition: '300% 50%',
        duration: 8,
        ease: 'none',
        repeat: -1,
      });
    },
    { scope: heroRef }
  );

  const trimmedUsername = username.trim();
  const debouncedUsername = useDebounce(trimmedUsername, 500);

  const previewUsername = instantUsername || debouncedUsername;
  const hasUsername = previewUsername.length > 0;
};