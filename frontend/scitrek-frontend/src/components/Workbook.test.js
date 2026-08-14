import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import WorkbookList from './WorkbookList';
import WorkbookPage from './WorkbookPage';
import { getWorkbookDetail, getWorkbooks } from '../services/api';

vi.mock('../services/api', () => ({
  getWorkbookDetail: vi.fn(),
  getWorkbooks: vi.fn(),
}));

vi.mock('./AuthenticatedImage', () => ({
  default: ({ src, alt, ...props }) => <img src={src} alt={alt} {...props} />,
}));

const RouterWrapper = ({ children }) => (
  <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    {children}
  </MemoryRouter>
);

describe('WorkbookList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders available workbooks with start and continue labels', async () => {
    getWorkbooks.mockResolvedValue([
      { id: 1, title: 'New Workbook', description: 'No sections', sections: [] },
      { id: 2, title: 'Started Workbook', description: 'Has sections', sections: [{ id: 9 }] },
    ]);

    render(<WorkbookList />, { wrapper: RouterWrapper });

    expect(await screen.findByText('New Workbook')).toBeInTheDocument();
    expect(screen.getByText('Started Workbook')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
  });

  test('renders API failure state', async () => {
    getWorkbooks.mockRejectedValue(new Error('api down'));

    render(<WorkbookList />, { wrapper: RouterWrapper });

    expect(await screen.findByText(/failed to load workbooks/i)).toBeInTheDocument();
  });

  test('empty list renders heading and no workbook links', async () => {
    getWorkbooks.mockResolvedValue([]);

    render(<WorkbookList />, { wrapper: RouterWrapper });

    expect(await screen.findByRole('heading', { name: /available workbooks/i })).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});

describe('WorkbookPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderDetail = () =>
    render(
      <MemoryRouter
        initialEntries={['/workbooks/7']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/workbooks/:id" element={<WorkbookPage />} />
        </Routes>
      </MemoryRouter>
    );

  test('loads workbook detail including table-of-contents sections', async () => {
    getWorkbookDetail.mockResolvedValue({
      title: 'Student Workbook',
      sections: [
        {
          id: 1,
          heading: 'Welcome',
          content_html: '<p>Intro content</p>',
          images: [{ id: 2, image: '/img.png', caption: 'Diagram', order: 1 }],
        },
      ],
    });

    renderDetail();

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: /student workbook/i })).toBeInTheDocument();
    expect(screen.getByText('Intro content')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /diagram/i })).toHaveAttribute('src', '/img.png');
    expect(getWorkbookDetail).toHaveBeenCalledWith('7', true);
  });

  test('renders load error', async () => {
    getWorkbookDetail.mockRejectedValue(new Error('missing'));

    renderDetail();

    expect(await screen.findByText(/failed to load workbook/i)).toBeInTheDocument();
  });

  test('renders sections without images', async () => {
    getWorkbookDetail.mockResolvedValue({
      title: 'Student Workbook',
      sections: [{ id: 1, heading: 'No Image', content_html: '<p>Text only</p>', images: [] }],
    });

    renderDetail();

    expect(await screen.findByText('Text only')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
