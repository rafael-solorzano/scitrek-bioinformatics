import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Popup from './Popup';

describe('Popup', () => {
  test('renders as an accessible confirmation dialog', () => {
    render(<Popup message="Are you sure?" onCancel={vi.fn()} onConfirm={vi.fn()} />);

    expect(screen.getByRole('dialog', { name: /are you sure/i })).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
  });

  test('calls onCancel when overlay is clicked', async () => {
    const onCancel = vi.fn();
    const { container } = render(<Popup message="Confirm?" onCancel={onCancel} onConfirm={vi.fn()} />);

    await userEvent.click(container.querySelector('.popup-overlay'));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test('calls onCancel when Escape is pressed', async () => {
    const onCancel = vi.fn();
    render(<Popup message="Confirm?" onCancel={onCancel} onConfirm={vi.fn()} />);

    await userEvent.keyboard('{Escape}');

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test('calls onConfirm from logout button', async () => {
    const onConfirm = vi.fn();
    render(<Popup message="Confirm?" onCancel={vi.fn()} onConfirm={onConfirm} />);

    await userEvent.click(screen.getByRole('button', { name: /logout/i }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
