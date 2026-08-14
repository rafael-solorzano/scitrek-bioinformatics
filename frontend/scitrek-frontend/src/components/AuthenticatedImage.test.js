import { render, screen, waitFor } from '@testing-library/react';
import AuthenticatedImage from './AuthenticatedImage';
import api from '../services/api';

vi.mock('../services/api', () => ({
  default: { get: vi.fn() },
}));

describe('AuthenticatedImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn(() => 'blob:authenticated-image');
    URL.revokeObjectURL = vi.fn();
  });

  test('loads image bytes through the authenticated API client', async () => {
    const blob = new Blob(['image'], { type: 'image/png' });
    api.get.mockResolvedValue({ data: blob });

    const { unmount } = render(
      <AuthenticatedImage src="/api/private/image/" alt="Private diagram" />
    );

    expect(api.get).toHaveBeenCalledWith('/api/private/image/', { responseType: 'blob' });
    expect(await screen.findByRole('img', { name: 'Private diagram' })).toHaveAttribute(
      'src',
      'blob:authenticated-image'
    );

    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:authenticated-image');
  });

  test('does not render a broken image when the authorized request fails', async () => {
    api.get.mockRejectedValue(new Error('forbidden'));

    render(<AuthenticatedImage src="/api/private/image/" alt="Private diagram" />);

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(screen.queryByRole('img', { name: 'Private diagram' })).not.toBeInTheDocument();
  });
});
