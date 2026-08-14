import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Gallery from './Gallery';

describe('Gallery', () => {
  test('renders the first slide content and media', () => {
    render(<Gallery />);

    expect(screen.getByRole('heading', { name: /dnmt3a enzyme/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/show slide 1/i)).toHaveAttribute('aria-current', 'true');
  });

  test('indicator buttons move to requested slide', async () => {
    render(<Gallery />);

    await userEvent.click(screen.getByLabelText(/show slide 2/i));

    expect(screen.getByRole('heading', { name: /morrissey works/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/show slide 2/i)).toHaveAttribute('aria-current', 'true');
  });

  test('indicator buttons are keyboard accessible', async () => {
    render(<Gallery />);

    screen.getByLabelText(/show slide 3/i).focus();
    await userEvent.keyboard('{Enter}');

    expect(screen.getByRole('heading', { name: /cancer screening/i })).toBeInTheDocument();
  });
});
