import React from 'react';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ContributorsClient from './ContributorsClient';

type Contributor = {
  id: number;
  login: string;
  avatar_url: string;
  contributions: number;
  html_url: string;
};

const mockContributors: Contributor[] = [
  {
    id: 1,
    login: 'alice',
    avatar_url: 'https://example.com/alice.png',
    contributions: 42,
    html_url: 'https://github.com/alice',
  },
  {
    id: 2,
    login: 'bob',
    avatar_url: 'https://example.com/bob.png',
    contributions: 17,
    html_url: 'https://github.com/bob',
  },
  {
    id: 3,
    login: 'carol',
    avatar_url: 'https://example.com/carol.png',
    contributions: 9,
    html_url: 'https://github.com/carol',
  },
];

const scrollTriggers = vi.hoisted(() => [{ kill: vi.fn() }]);

vi.mock('gsap', () => ({
  default: {
    registerPlugin: vi.fn(),
    fromTo: vi.fn(),
    to: vi.fn(),
  },
}));

vi.mock('gsap/ScrollTrigger', () => ({
  ScrollTrigger: {
    getAll: () => scrollTriggers,
  },
}));

vi.mock('next/image', () => ({
  default: ({
    alt,
    src,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & { width?: number; height?: number }) => (
    <img alt={alt} src={src} {...props} />
  ),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('framer-motion', () => {
  const MotionDiv = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { animate?: unknown }
  >(({ animate, children, ...props }, ref) => (
    <div ref={ref} data-animate={JSON.stringify(animate ?? null)} {...props}>
      {children}
    </div>
  ));
  MotionDiv.displayName = 'MotionDiv';

  const MotionSpan = ({ children }: { children?: React.ReactNode }) => <span>{children}</span>;
  const MotionHeading = ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLHeadingElement> & { animate?: unknown }) => (
    <h1 {...props}>{children}</h1>
  );
  const MotionParagraph = ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLParagraphElement> & { animate?: unknown }) => (
    <p {...props}>{children}</p>
  );

  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      div: MotionDiv,
      h1: MotionHeading,
      p: MotionParagraph,
      span: MotionSpan,
    },
    useMotionValue: () => ({ set: vi.fn() }),
    useSpring: (value: unknown) => value,
    useTransform: (_value: unknown, transform: (value: number) => number) => transform(0),
  };
});

const renderClient = () =>
  render(
    <ContributorsClient
      contributors={mockContributors}
      totalContributions={68}
      topContributors={mockContributors}
    />
  );

describe('ContributorsClient - Interactive Tooltips, Cursor Hovers & Touch Event Propagation', () => {
  const rafCallbacks: FrameRequestCallback[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    rafCallbacks.length = 0;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      rafCallbacks.push(callback);
      return rafCallbacks.length;
    });
  });

  it('triggers mouse hover gestures on magnetic CTA nodes and computes responsive coordinates', async () => {
    const { container } = renderClient();
    const exploreLink = screen.getByRole('link', { name: /Explore The Elite/i });
    const magneticWrapper = exploreLink.parentElement as HTMLElement;

    vi.spyOn(magneticWrapper, 'getBoundingClientRect').mockReturnValue({
      x: 100,
      y: 40,
      width: 200,
      height: 80,
      top: 40,
      right: 300,
      bottom: 120,
      left: 100,
      toJSON: () => ({}),
    } as DOMRect);

    fireEvent.mouseMove(magneticWrapper, { clientX: 250, clientY: 100 });

    await waitFor(() => {
      expect(magneticWrapper).toHaveAttribute('data-animate', JSON.stringify({ x: 10, y: 4 }));
    });
    expect(container.querySelector('[data-animate="{\\"x\\":10,\\"y\\":4}"]')).toBeTruthy();
  });

  it('updates the custom cursor transform from window mouse coordinates', () => {
    const { container } = renderClient();
    const cursor = container.querySelector('.pointer-events-none.z-\\[100\\]') as HTMLElement;

    fireEvent.mouseMove(window, { clientX: 200, clientY: 100 });
    rafCallbacks[0](16);

    expect(cursor).toHaveClass('fixed', 'pointer-events-none', 'hidden', 'md:block');
    expect(cursor.style.transform).toBe('translate3d(30px, 15px, 0)');
  });

  it('propagates click and touch gestures from CTA links through the client boundary', () => {
    const onBoundaryClick = vi.fn();
    const onBoundaryTouchStart = vi.fn();

    render(
      <div onClick={onBoundaryClick} onTouchStart={onBoundaryTouchStart}>
        <ContributorsClient
          contributors={mockContributors}
          totalContributions={68}
          topContributors={mockContributors}
        />
      </div>
    );

    const repositoryLink = screen.getByRole('link', { name: /View Repository/i });
    fireEvent.touchStart(repositoryLink);
    fireEvent.click(repositoryLink);

    expect(repositoryLink).toHaveAttribute('href', 'https://github.com/JhaSourav07/commitpulse');
    expect(onBoundaryTouchStart).toHaveBeenCalledTimes(1);
    expect(onBoundaryClick).toHaveBeenCalledTimes(1);
  });

  it('applies cursor-safe hover classes to interactive links without blocking pointer events', () => {
    const { container } = renderClient();
    const cursor = container.querySelector('.pointer-events-none.z-\\[100\\]') as HTMLElement;
    const exploreLink = screen.getByRole('link', { name: /Explore The Elite/i });
    const profileLink = container.querySelector(
      'a[href="https://github.com/alice"]'
    ) as HTMLElement;

    expect(cursor).toHaveClass('pointer-events-none');
    expect(exploreLink).toHaveClass('group', 'hover:scale-105', 'active:scale-95');
    expect(profileLink).toHaveClass('block', 'hover:border-black/20', 'hover:bg-black/[0.05]');
  });

  it('hides temporary hover offsets when mouseleave resets the magnetic overlay visuals', async () => {
    renderClient();
    const repositoryLink = screen.getByRole('link', { name: /View Repository/i });
    const magneticWrapper = repositoryLink.parentElement as HTMLElement;

    vi.spyOn(magneticWrapper, 'getBoundingClientRect').mockReturnValue({
      x: 20,
      y: 20,
      width: 100,
      height: 40,
      top: 20,
      right: 120,
      bottom: 60,
      left: 20,
      toJSON: () => ({}),
    } as DOMRect);

    fireEvent.mouseMove(magneticWrapper, { clientX: 90, clientY: 50 });
    await waitFor(() => {
      expect(magneticWrapper).toHaveAttribute('data-animate', JSON.stringify({ x: 4, y: 2 }));
    });

    fireEvent.mouseLeave(magneticWrapper);

    await waitFor(() => {
      expect(magneticWrapper).toHaveAttribute('data-animate', JSON.stringify({ x: 0, y: 0 }));
    });
  });
});
