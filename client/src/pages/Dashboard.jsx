import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Music2, AlertCircle, TrendingUp, ChevronRight, Calendar } from 'lucide-react';
import { api } from '../api';

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function StatCard({ icon: Icon, label, value, sub, color, to }) {
  const inner = (
    <div className="card flex items-center gap-4 hover:shadow-apple-md transition-shadow group">
      <div className={`w-11 h-11 rounded-apple-sm flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={20} className="text-white" strokeWidth={1.8} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xl font-semibold text-apple-text truncate">{value}</div>
        <div className="text-xs text-apple-gray-5 mt-0.5">{label}</div>
        {sub && <div className="text-xs text-apple-gray-4 mt-0.5">{sub}</div>}
      </div>
      {to && <ChevronRight size={14} className="text-apple-gray-3 group-hover:text-apple-gray-5 flex-shrink-0" />}
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

export default function Dashboard() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [paymentStats, setPaymentStats] = useState({});
  const [overduePayments, setOverduePayments] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  const today = DAYS[new Date().getDay()];

  useEffect(() => {
    Promise.all([
      api.getStudents({ active: true }),
      api.getClasses(),
      api.getPaymentStats(),
      api.getPayments({ status: 'overdue' }),
      api.getSettings(),
    ]).then(([s, c, ps, op, st]) => {
      setStudents(s); setClasses(c); setPaymentStats(ps);
      setOverduePayments(op.slice(0, 5)); setSettings(st);
    }).finally(() => setLoading(false));
  }, []);

  const todayClasses = classes.filter(c => c.day_of_week === today);
  const currency = settings.currency || '₹';

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center space-y-2">
        <div className="text-4xl">🪷</div>
        <div className="text-sm text-apple-gray-5">Loading…</div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-apple-text tracking-tight">
          {settings.school_name || 'Tritiya Dance Studio'}
        </h1>
        <p className="text-sm text-apple-gray-5 mt-1">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          {todayClasses.length > 0 && (
            <span className="ml-2 text-apple-blue font-medium">· {todayClasses.length} class{todayClasses.length > 1 ? 'es' : ''} today</span>
          )}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Users}        label="Active Students"    value={students.length}                                                 color="bg-apple-blue"   to="/students" />
        <StatCard icon={Music2}       label="Classes"            value={classes.length}   sub={`${todayClasses.length} today`}           color="bg-purple-500"   to="/classes" />
        <StatCard icon={AlertCircle}  label="Fees Pending"       value={`${currency}${(paymentStats.total_pending||0).toLocaleString()}`} color="bg-apple-orange" to="/payments" />
        <StatCard icon={TrendingUp}   label="Collected (Month)"  value={`${currency}${(paymentStats.paid_this_month||0).toLocaleString()}`} color="bg-apple-green" to="/payments" />
      </div>

      {/* Two columns */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Today's classes */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm text-apple-text flex items-center gap-1.5">
              <Calendar size={15} className="text-apple-blue" /> Today's Classes
            </h2>
            <Link to="/attendance" className="text-xs text-apple-blue hover:underline">Mark Attendance</Link>
          </div>
          {todayClasses.length === 0 ? (
            <div className="text-center py-8">
              <Music2 size={28} className="mx-auto mb-2 text-apple-gray-3" strokeWidth={1.5} />
              <p className="text-sm text-apple-gray-5">No classes today</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayClasses.map(cls => (
                <div key={cls.id} className="flex items-center justify-between bg-apple-gray rounded-apple-sm px-3 py-2.5">
                  <div>
                    <div className="text-sm font-medium text-apple-text">{cls.name}</div>
                    <div className="text-xs text-apple-gray-5">{cls.start_time} – {cls.end_time}</div>
                  </div>
                  <span className="text-xs text-apple-blue font-medium">{cls.studentCount} students</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Overdue payments */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm text-apple-text flex items-center gap-1.5">
              <AlertCircle size={15} className="text-apple-red" />
              Overdue Payments
              {paymentStats.overdue_count > 0 && (
                <span className="bg-apple-red text-white text-xs px-1.5 py-0.5 rounded-full leading-none">{paymentStats.overdue_count}</span>
              )}
            </h2>
            <Link to="/payments?status=overdue" className="text-xs text-apple-blue hover:underline">View All</Link>
          </div>
          {overduePayments.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-2xl mb-1">✓</div>
              <p className="text-sm text-apple-green font-medium">All clear!</p>
              <p className="text-xs text-apple-gray-5 mt-0.5">No overdue payments</p>
            </div>
          ) : (
            <div className="space-y-2">
              {overduePayments.map(p => (
                <div key={p.id} className="flex items-center justify-between bg-red-50 rounded-apple-sm px-3 py-2.5">
                  <div>
                    <div className="text-sm font-medium text-apple-text">{p.student_name}</div>
                    <div className="text-xs text-apple-gray-5">Due {new Date(p.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                  </div>
                  <span className="text-sm font-semibold text-apple-red">{currency}{p.amount}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Weekly schedule */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-sm text-apple-text">Weekly Schedule</h2>
        {/* Desktop */}
        <div className="hidden sm:grid grid-cols-7 gap-2">
          {DAYS.slice(1).concat(DAYS[0]).map(day => {
            const dayCls = classes.filter(c => c.day_of_week === day);
            const isToday = day === today;
            return (
              <div key={day} className={`rounded-apple-sm p-2 min-h-[72px] ${isToday ? 'bg-apple-blue/8 ring-1 ring-apple-blue/30' : 'bg-apple-gray'}`}>
                <div className={`text-xs font-semibold mb-1.5 ${isToday ? 'text-apple-blue' : 'text-apple-gray-5'}`}>{day.slice(0,3)}</div>
                {dayCls.map(c => (
                  <div key={c.id} className={`text-[10px] rounded px-1 py-0.5 mb-1 truncate font-medium ${isToday ? 'bg-apple-blue text-white' : 'bg-white text-apple-text border border-apple-gray-2'}`} title={c.name}>{c.name}</div>
                ))}
                {dayCls.length === 0 && <div className="text-apple-gray-3 text-[10px]">—</div>}
              </div>
            );
          })}
        </div>
        {/* Mobile */}
        <div className="sm:hidden space-y-1.5">
          {DAYS.slice(1).concat(DAYS[0]).map(day => {
            const dayCls = classes.filter(c => c.day_of_week === day);
            const isToday = day === today;
            if (!dayCls.length && !isToday) return null;
            return (
              <div key={day} className={`flex items-center gap-3 rounded-apple-sm px-3 py-2 ${isToday ? 'bg-apple-blue/8' : 'bg-apple-gray'}`}>
                <span className={`text-xs font-semibold w-8 ${isToday ? 'text-apple-blue' : 'text-apple-gray-5'}`}>{day.slice(0,3)}</span>
                <div className="flex flex-wrap gap-1">
                  {dayCls.length === 0 ? <span className="text-xs text-apple-gray-4">No classes</span>
                    : dayCls.map(c => <span key={c.id} className={`text-xs px-2 py-0.5 rounded-full font-medium ${isToday ? 'bg-apple-blue text-white' : 'bg-white text-apple-text border border-apple-gray-2'}`}>{c.name}</span>)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
