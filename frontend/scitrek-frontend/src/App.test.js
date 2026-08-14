import { render, screen } from '@testing-library/react';
import App from './App';

vi.mock('axios', () => ({
  default: {
    create: () => ({
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
    }),
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

test('renders login page with guest access', async () => {
  render(<App />);

  expect(await screen.findByRole('heading', { name: /welcome to scitrek/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /continue as guest/i })).toBeInTheDocument();
});
