const BASE = '/api';

function getToken() { return localStorage.getItem('auth_token'); }

async function request(method, path, body) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + path, opts);
  if (res.status === 401) { localStorage.removeItem('auth_token'); window.location.reload(); return; }
  if (!res.ok) { const err = await res.json().catch(() => ({ error: res.statusText })); throw new Error(err.error || 'Request failed'); }
  return res.json();
}

export const api = {
  // Students
  getStudents: (p = {}) => request('GET', '/students?' + new URLSearchParams(p)),
  getStudent: (id) => request('GET', `/students/${id}`),
  createStudent: (data) => request('POST', '/students', data),
  updateStudent: (id, data) => request('PUT', `/students/${id}`, data),
  deleteStudent: (id) => request('DELETE', `/students/${id}`),
  enrollStudent: (sid, cid) => request('POST', `/students/${sid}/enroll`, { class_id: cid }),
  unenrollStudent: (sid, cid) => request('DELETE', `/students/${sid}/enroll/${cid}`),
  bulkImportStudents: (students) => request('POST', '/students/bulk-import', { students }),
  getStudentCredentials: (id) => request('GET', `/students/${id}/credentials`),
  resetParentPassword: (id) => request('POST', `/students/${id}/reset-password`),
  getStudentPortalCredentials: (id) => request('GET', `/students/${id}/student-credentials`),
  generateStudentCredentials: (id) => request('POST', `/students/${id}/student-credentials`),

  // Classes
  getClasses: () => request('GET', '/classes'),
  getClass: (id) => request('GET', `/classes/${id}`),
  createClass: (data) => request('POST', '/classes', data),
  updateClass: (id, data) => request('PUT', `/classes/${id}`, data),
  deleteClass: (id) => request('DELETE', `/classes/${id}`),
  addStudentToClass: (cid, sid) => request('POST', `/classes/${cid}/students`, { student_id: sid }),
  removeStudentFromClass: (cid, sid) => request('DELETE', `/classes/${cid}/students/${sid}`),
  getAvailableStudents: (cid) => request('GET', `/classes/${cid}/available-students`),
  bulkImportClasses: (classes) => request('POST', '/classes/bulk-import', { classes }),

  // Attendance
  getSessions: (p = {}) => request('GET', '/attendance/sessions?' + new URLSearchParams(p)),
  getSession: (id) => request('GET', `/attendance/sessions/${id}`),
  createSession: (data) => request('POST', '/attendance/sessions', data),
  markAttendance: (sid, att) => request('POST', `/attendance/sessions/${sid}/mark`, { attendance: att }),

  // Payments
  getPayments: (p = {}) => request('GET', '/payments?' + new URLSearchParams(p)),
  getPaymentStats: () => request('GET', '/payments/stats'),
  createPayment: (data) => request('POST', '/payments', data),
  updatePayment: (id, data) => request('PUT', `/payments/${id}`, data),
  markPaid: (id, data) => request('POST', `/payments/${id}/mark-paid`, data),
  deletePayment: (id) => request('DELETE', `/payments/${id}`),
  sendReminder: (id) => request('POST', `/payments/${id}/remind`),
  bulkMonthlyFees: (data) => request('POST', '/payments/bulk/monthly', data),

  // Lesson Plans
  getLessonPlans: (p = {}) => request('GET', '/lesson-plans?' + new URLSearchParams(p)),
  getLessonPlan: (id) => request('GET', `/lesson-plans/${id}`),
  createLessonPlan: (data) => request('POST', '/lesson-plans', data),
  updateLessonPlan: (id, data) => request('PUT', `/lesson-plans/${id}`, data),
  deleteLessonPlan: (id) => request('DELETE', `/lesson-plans/${id}`),
  notifyLessonPlan: (id) => request('POST', `/lesson-plans/${id}/notify`),
  getStudentPlans: (sid) => request('GET', `/lesson-plans/student/${sid}`),
  bulkImportLessonPlans: (plans) => request('POST', '/lesson-plans/bulk-import', { plans }),

  // Settings
  getSettings: () => request('GET', '/settings'),
  saveSettings: (data) => request('POST', '/settings', data),
  testEmail: (email) => request('POST', '/settings/test-email', { email }),
  testWhatsApp: (phone) => request('POST', '/settings/test-whatsapp', { phone }),
  getEmailLogs: () => request('GET', '/settings/email-logs'),
  getWhatsAppLogs: () => request('GET', '/settings/whatsapp-logs'),

  // Parent portal
  getParentStudent: (sid) => request('GET', `/parent/student/${sid}`),
  getParentAttendance: (sid) => request('GET', `/parent/student/${sid}/attendance`),
  getParentPayments: (sid) => request('GET', `/parent/student/${sid}/payments`),
  getParentPlans: (sid) => request('GET', `/parent/student/${sid}/plans`),
};
