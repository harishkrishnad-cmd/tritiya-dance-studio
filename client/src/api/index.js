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
  if (res.status === 401) {
    localStorage.removeItem('auth_token');
    window.location.reload();
    return;
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  getStudents: (params = {}) => request('GET', '/students?' + new URLSearchParams(params)),
  getStudent: (id) => request('GET', `/students/${id}`),
  createStudent: (data) => request('POST', '/students', data),
  updateStudent: (id, data) => request('PUT', `/students/${id}`, data),
  deleteStudent: (id) => request('DELETE', `/students/${id}`),
  enrollStudent: (studentId, classId) => request('POST', `/students/${studentId}/enroll`, { class_id: classId }),
  unenrollStudent: (studentId, classId) => request('DELETE', `/students/${studentId}/enroll/${classId}`),

  getClasses: () => request('GET', '/classes'),
  getClass: (id) => request('GET', `/classes/${id}`),
  createClass: (data) => request('POST', '/classes', data),
  updateClass: (id, data) => request('PUT', `/classes/${id}`, data),
  deleteClass: (id) => request('DELETE', `/classes/${id}`),
  addStudentToClass: (classId, studentId) => request('POST', `/classes/${classId}/students`, { student_id: studentId }),
  removeStudentFromClass: (classId, studentId) => request('DELETE', `/classes/${classId}/students/${studentId}`),
  getAvailableStudents: (classId) => request('GET', `/classes/${classId}/available-students`),

  getSessions: (params = {}) => request('GET', '/attendance/sessions?' + new URLSearchParams(params)),
  getSession: (id) => request('GET', `/attendance/sessions/${id}`),
  createSession: (data) => request('POST', '/attendance/sessions', data),
  markAttendance: (sessionId, attendance) => request('POST', `/attendance/sessions/${sessionId}/mark`, { attendance }),
  getStudentAttendance: (studentId) => request('GET', `/attendance/student/${studentId}`),

  getPayments: (params = {}) => request('GET', '/payments?' + new URLSearchParams(params)),
  getPaymentStats: () => request('GET', '/payments/stats'),
  createPayment: (data) => request('POST', '/payments', data),
  updatePayment: (id, data) => request('PUT', `/payments/${id}`, data),
  markPaid: (id, data) => request('POST', `/payments/${id}/mark-paid`, data),
  deletePayment: (id) => request('DELETE', `/payments/${id}`),
  sendReminder: (id) => request('POST', `/payments/${id}/remind`),
  bulkMonthlyFees: (data) => request('POST', '/payments/bulk/monthly', data),

  getSettings: () => request('GET', '/settings'),
  saveSettings: (data) => request('POST', '/settings', data),
  testEmail: (email) => request('POST', '/settings/test-email', { email }),
  getEmailLogs: () => request('GET', '/settings/email-logs'),
};
