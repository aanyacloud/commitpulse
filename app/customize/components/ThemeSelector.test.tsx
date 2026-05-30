import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeSelector } from './ThemeSelector';
import { THEME_KEYS } from '../types';
import userEvent from '@testing-library/user-event';

describe('ThemeSelector', () => {
  const onThemeChange = vi.fn();

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<ThemeSelector theme="dark" onThemeChange={onThemeChange} />);
    screen.getByRole('combobox');
  });

  it('renders a select element with all theme options', () => {
    render(<ThemeSelector theme="dark" onThemeChange={onThemeChange} />);
    const options = screen.getAllByRole('option');
    expect(options.length).toBe(THEME_KEYS.length);
  });

  it('renders the SectionLabel with "Theme Preset" text', () => {
    render(<ThemeSelector theme="dark" onThemeChange={onThemeChange} />);
    screen.getByText('Theme Preset');
  });

  it('shows "switches with OS theme" text when theme is "auto"', () => {
    render(<ThemeSelector theme="auto" onThemeChange={onThemeChange} />);
    screen.getByText(/switches with OS theme/i);
  });

  it('shows "changes on each load" text when theme is "random"', () => {
    render(<ThemeSelector theme="random" onThemeChange={onThemeChange} />);
    screen.getByText(/changes on each load/i);
  });

  it('shows "bg · accent · text" text for a regular theme', () => {
    render(<ThemeSelector theme="dark" onThemeChange={onThemeChange} />);
    screen.getByText(/bg · accent · text/i);
  });

  it('renders the Shuffle button', () => {
    render(<ThemeSelector theme="dark" onThemeChange={onThemeChange} />);
    expect(screen.getByTitle('Pick a random theme')).toBeTruthy();
  });

  it('clicking Shuffle calls onThemeChange with a valid theme key', async () => {
    const user = userEvent.setup();
    render(<ThemeSelector theme="dark" onThemeChange={onThemeChange} />);
    const shuffleBtn = screen.getByTitle('Pick a random theme');
    await user.click(shuffleBtn);
    expect(onThemeChange).toHaveBeenCalledTimes(1);
    const calledWith = onThemeChange.mock.calls[0][0];
    expect(THEME_KEYS).toContain(calledWith);
    expect(calledWith).not.toBe('auto');
    expect(calledWith).not.toBe('random');
  });

  it('changing the select calls onThemeChange with the selected value', async () => {
    const user = userEvent.setup();
    render(<ThemeSelector theme="dark" onThemeChange={onThemeChange} />);
    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'neon');
    expect(onThemeChange).toHaveBeenCalledWith('neon');
  });

  it('renders color swatches for a normal theme', () => {
    render(<ThemeSelector theme="dark" onThemeChange={onThemeChange} />);
    const swatches = screen.getAllByTitle(/^(bg|accent|text):/i);
    expect(swatches.length).toBe(3);
  });
});
