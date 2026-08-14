import { expect, test } from '@playwright/test';

import { apiToken, backendURL, bearer, loginThroughUI } from './helpers';

test('teacher observes work persisted by a student and student cannot access teacher reports', async ({
  page,
  request,
}) => {
  await loginThroughUI(page);
  await page.goto('/sections/day-1');
  await page.getByPlaceholder(/Use terms like promoter/i).fill('Cross-role persistence proof');
  page.once('dialog', async dialog => dialog.accept());
  await page.getByRole('button', { name: /^Save$/ }).click();

  const teacherToken = await apiToken(request, 'teacher1001', 'teacher1001');
  const classroomsResponse = await request.get(`${backendURL}/api/classroom/classrooms/`, {
    headers: bearer(teacherToken),
  });
  expect(classroomsResponse.ok()).toBeTruthy();
  const classroomPayload = await classroomsResponse.json();
  const classrooms = classroomPayload.results || classroomPayload;
  const classroom = classrooms.find((item: { name: string }) => item.name === '1001');
  expect(classroom).toBeTruthy();

  const report = await request.get(
    `${backendURL}/api/classroom/classrooms/${classroom.id}/progress/`,
    { headers: bearer(teacherToken) },
  );
  expect(report.ok()).toBeTruthy();
  const progress = await report.json();
  expect(progress.by_day.find((item: { day: number }) => item.day === 1).completed).toBeGreaterThan(0);

  const studentToken = await apiToken(request, 'student1001', 'student1001');
  const forbidden = await request.get(
    `${backendURL}/api/classroom/classrooms/${classroom.id}/progress/`,
    { headers: bearer(studentToken) },
  );
  expect(forbidden.status()).toBe(403);
});
