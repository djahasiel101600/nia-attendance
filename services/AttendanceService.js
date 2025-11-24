//services/AttendanceService.js
import { API_CONFIG, APP_CONFIG } from '../constants/config';
import AuthService from './AuthService';

const BASE_URL = API_CONFIG.BASE_URL;

function parseNetDate(netDateString) {
  try {
    const m = /\/Date\((\d+)\)\//.exec(netDateString);
    if (m) {
      const ts = parseInt(m[1], 10);
      const d = new Date(ts);
      return d;
    }
  } catch (e) {}
  return new Date();
}

class AttendanceService {
  getAttendanceData = async (employeeId, opts = {}) => {
    const { length = APP_CONFIG.DEFAULT_RECORDS_LENGTH, year, month } = opts;
    try {
      // Reuse session cookies stored by AuthService if available
      const cookies = await AuthService.getSessionCookies();

      const queryYear = year || new Date().getFullYear();
      const queryMonth = month || new Date().toLocaleString('default', { month: 'long' });

      const url = `${BASE_URL}/Attendance/IndexData/${queryYear}?month=${encodeURIComponent(queryMonth)}&eid=${encodeURIComponent(employeeId)}`;

  const form = new URLSearchParams();
  form.append('draw', '1');

  // Column definitions (match server expectations)
  form.append('columns[0][data]', 'Id');
  form.append('columns[0][name]', '');
  form.append('columns[0][searchable]', 'true');
  form.append('columns[0][orderable]', 'true');
  form.append('columns[0][search][value]', '');
  form.append('columns[0][search][regex]', 'false');

  form.append('columns[1][data]', 'DateTimeStamp');
  form.append('columns[1][name]', '');
  form.append('columns[1][searchable]', 'true');
  form.append('columns[1][orderable]', 'true');
  form.append('columns[1][search][value]', '');
  form.append('columns[1][search][regex]', 'false');

  form.append('columns[2][data]', 'Temperature');
  form.append('columns[2][name]', '');
  form.append('columns[2][searchable]', 'true');
  form.append('columns[2][orderable]', 'true');
  form.append('columns[2][search][value]', '');
  form.append('columns[2][search][regex]', 'false');

  form.append('columns[3][data]', 'Name');
  form.append('columns[3][name]', '');
  form.append('columns[3][searchable]', 'true');
  form.append('columns[3][orderable]', 'true');
  form.append('columns[3][search][value]', '');
  form.append('columns[3][search][regex]', 'false');

  form.append('columns[4][data]', 'EmployeeID');
  form.append('columns[4][name]', '');
  form.append('columns[4][searchable]', 'true');
  form.append('columns[4][orderable]', 'true');
  form.append('columns[4][search][value]', '');
  form.append('columns[4][search][regex]', 'false');

  form.append('columns[5][data]', 'MachineName');
  form.append('columns[5][name]', '');
  form.append('columns[5][searchable]', 'true');
  form.append('columns[5][orderable]', 'true');
  form.append('columns[5][search][value]', '');
  form.append('columns[5][search][regex]', 'false');

  form.append('order[0][column]', '1');
  form.append('order[0][dir]', 'desc');
  form.append('start', '0');
  form.append('length', String(length));
  form.append('search[value]', '');
  form.append('search[regex]', 'false');

      const originHost = BASE_URL.replace(/^https?:\/\//, '');
      const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
        'Cookie': cookies || '',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': originHost,
        'Referer': `${BASE_URL}/Attendance`
      };

      // Debugging: log cookie/header summary
      console.log('🔍 Attendance POST headers:', {
        Cookie: headers.Cookie ? headers.Cookie.slice(0, 200) : '',
        Origin: headers.Origin,
        Referer: headers.Referer
      });

      const bodyString = form.toString();
      console.log('🔎 POST', url);
      console.log('🔎 POST body sample:', bodyString.slice(0, 300));

      const resp = await fetch(url, {
        method: 'POST',
        headers,
        body: bodyString
      });

      console.log(`🔎 POST ${url} -> ${resp.status} ${resp.url}`);
      if (!resp.ok) {
        const text = await resp.text().catch(() => '<no body>');
        console.error('❌ Attendance POST failed:', resp.status, text ? text.slice(0, 1000) : '<no body>');
        throw new Error(`Network error: ${resp.status}`);
      }

      const json = await resp.json();

      const records = (json.data || []).map((r) => {
        const dt = parseNetDate(r.DateTimeStamp || r.date || r.Date);
        return {
          date_time: dt,
          date_time_string: dt.toLocaleString(),
          temperature: r.Temperature || null,
          employee_id: r.EmployeeID || r.EmployeeId || '',
          employee_name: r.Name || r.EmployeeName || '',
          machine_name: r.MachineName || r.Device || '',
          status: (r.AccessResult === 1 || r.AccessResult === '1') ? 'ACCESS_GRANTED' : 'ACCESS_DENIED',
        };
      });

      return { records, total_records: json.recordsTotal || records.length };
    } catch (e) {
      console.warn('Attendance fetch error', e);
      return null;
    }
  };
}

export default new AttendanceService();
