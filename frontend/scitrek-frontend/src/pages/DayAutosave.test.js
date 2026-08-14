import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import Day1Page from './Day1Page';
import Day2Page from './Day2Page';
import Day3Page from './Day3Page';
import Day4Page from './Day4Page';
import Day5Page from './Day5Page';
import { getCurrentUser, getResponseDetail, upsertResponse } from '../services/api';

vi.mock('../components/StudentProfileBanner', () => ({
  default: function MockStudentProfileBanner({ user, onLogout }) {
    return (
      <header>
        <span>Hello, {user?.first_name || user?.username || 'student'}</span>
        <button type="button" onClick={onLogout}>Logout</button>
      </header>
    );
  },
}));

vi.mock('../components/Popup', () => ({
  default: function MockPopup({ onConfirm, onCancel }) {
    return (
      <div role="dialog">
        <button type="button" onClick={onConfirm}>Confirm logout</button>
        <button type="button" onClick={onCancel}>Cancel logout</button>
      </div>
    );
  },
}));

vi.mock('../services/api', () => ({
  getCurrentUser: vi.fn(),
  getResponseDetail: vi.fn(),
  upsertResponse: vi.fn(),
}));

const mockUser = {
  username: 'student1001',
  first_name: 'Student',
  classroom_name: '1001',
};

function renderDay(Component, day) {
  return render(
    <MemoryRouter
      initialEntries={[`/sections/day-${day}`]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path={`/sections/day-${day}`} element={<Component />} />
      </Routes>
    </MemoryRouter>
  );
}

async function renderLoadedDay(Component, day, headingPattern) {
  getCurrentUser.mockResolvedValue(mockUser);
  getResponseDetail.mockRejectedValue({ response: { status: 404 } });
  upsertResponse.mockResolvedValue({});

  renderDay(Component, day);

  await flushPromises();
  expect(screen.getByRole('heading', { name: headingPattern })).toBeInTheDocument();
}

async function flushPromises() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function runAutosaveDebounce() {
  await flushPromises();
  await act(async () => {
    vi.advanceTimersByTime(2100);
    await Promise.resolve();
  });
  vi.useRealTimers();
}

describe('Day page debounced autosave', () => {
  beforeEach(() => {
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  test('Day 1 autosaves the first response edit after debounce', async () => {
    vi.useFakeTimers({ shouldClearNativeTimers: true });
    await renderLoadedDay(Day1Page, 1, /Day 1: Unlocking the Code/i);

    fireEvent.change(screen.getByPlaceholderText(/Use terms like promoter/i), {
      target: { value: 'Gene regulation answer' },
    });

    await runAutosaveDebounce();

    await waitFor(() => expect(upsertResponse).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        geneQ1: 'Gene regulation answer',
      })
    ), { timeout: 3000 });
  });

  test('Day 1 autosaves the latest rapid edit payload', async () => {
    vi.useFakeTimers({ shouldClearNativeTimers: true });
    await renderLoadedDay(Day1Page, 1, /Day 1: Unlocking the Code/i);

    const answer = screen.getByPlaceholderText(/Use terms like promoter/i);
    fireEvent.change(answer, { target: { value: 'first draft' } });
    fireEvent.change(answer, { target: { value: 'latest draft' } });

    await runAutosaveDebounce();

    await waitFor(() => expect(upsertResponse).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        geneQ1: 'latest draft',
      })
    ), { timeout: 3000 });
  });

  test('Day 1 trims simulation answer arrays to the fields students can edit', async () => {
    getCurrentUser.mockResolvedValue(mockUser);
    getResponseDetail.mockResolvedValue({
      answers: {
        sim: {
          gene1: ['one', 'two', 'three', 'hidden'],
          gene2: ['a', 'b', 'c', 'd'],
          gene3: ['i', 'ii', 'iii', 'iv', 'hidden'],
          reflections: ['r1', 'r2', 'r3', 'r4'],
        },
      },
    });
    upsertResponse.mockResolvedValue({});

    renderDay(Day1Page, 1);

    expect(await screen.findByDisplayValue('one')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('hidden')).not.toBeInTheDocument();
  });

  test('Day 2 autosaves the first cell-cycle edit after debounce', async () => {
    vi.useFakeTimers({ shouldClearNativeTimers: true });
    await renderLoadedDay(Day2Page, 2, /Day 2: Understanding Cancer/i);

    fireEvent.change(screen.getByPlaceholderText(/G1 \(Gap\/Growth 1\)/i), {
      target: { value: 'Cells grow and prepare.' },
    });

    await runAutosaveDebounce();

    await waitFor(() => expect(upsertResponse).toHaveBeenCalledWith(
      2,
      expect.objectContaining({
        cellCycle: expect.objectContaining({
          interphaseG1: 'Cells grow and prepare.',
        }),
      })
    ), { timeout: 3000 });
  });

  test('Day 2 manual save uses the latest typed answer', async () => {
    await renderLoadedDay(Day2Page, 2, /Day 2: Understanding Cancer/i);

    const response = screen.getByPlaceholderText(/G1 \(Gap\/Growth 1\)/i);
    fireEvent.change(response, { target: { value: 'old answer' } });
    fireEvent.change(response, { target: { value: 'new answer' } });
    fireEvent.click(screen.getAllByRole('button', { name: /save answers/i })[0]);

    await waitFor(() => expect(upsertResponse).toHaveBeenCalledWith(
      2,
      expect.objectContaining({
        cellCycle: expect.objectContaining({
          interphaseG1: 'new answer',
        }),
      })
    ));
  });

  test('Day 3 autosaves the first hypothesis edit after debounce', async () => {
    vi.useFakeTimers({ shouldClearNativeTimers: true });
    await renderLoadedDay(Day3Page, 3, /Day 3: Seeing Static/i);

    fireEvent.change(screen.getByPlaceholderText(/Type your hypothesis/i), {
      target: { value: 'Cancer samples will show changed expression.' },
    });

    await runAutosaveDebounce();

    await waitFor(() => expect(upsertResponse).toHaveBeenCalledWith(
      3,
      expect.objectContaining({
        detective: expect.objectContaining({
          hypothesis: 'Cancer samples will show changed expression.',
        }),
      })
    ), { timeout: 3000 });
  });

  test('Day 4 autosaves the first recap edit after debounce', async () => {
    vi.useFakeTimers({ shouldClearNativeTimers: true });
    await renderLoadedDay(Day4Page, 4, /Day 4: Levels of Expression/i);

    fireEvent.change(screen.getByPlaceholderText(/mutations, epigenetic changes/i), {
      target: { value: 'Mutations can change transcription.' },
    });

    await runAutosaveDebounce();

    await waitFor(() => expect(upsertResponse).toHaveBeenCalledWith(
      4,
      expect.objectContaining({
        recap: expect.objectContaining({
          regWrong: 'Mutations can change transcription.',
        }),
      })
    ), { timeout: 3000 });
  });

  test('Day 4 renders scenario fields with empty defaults', async () => {
    await renderLoadedDay(Day4Page, 4, /Day 4: Levels of Expression/i);

    expect(screen.getByLabelText(/Scenario 1/i)).toHaveValue('');
    expect(screen.getByLabelText(/Scenario 2/i)).toHaveValue('');
    expect(screen.getByLabelText(/Scenario 3/i)).toHaveValue('');
  });

  test('Day 5 autosaves the first project-title edit after debounce', async () => {
    vi.useFakeTimers({ shouldClearNativeTimers: true });
    await renderLoadedDay(Day5Page, 5, /Day 5: Poster Presentation/i);

    fireEvent.change(screen.getByPlaceholderText(/BRCA-1 Gene/i), {
      target: { value: 'BRCA1 and breast cancer' },
    });

    await runAutosaveDebounce();

    await waitFor(() => expect(upsertResponse).toHaveBeenCalledWith(
      5,
      expect.objectContaining({
        step1: expect.objectContaining({
          title: 'BRCA1 and breast cancer',
        }),
      })
    ), { timeout: 3000 });
  });
});
