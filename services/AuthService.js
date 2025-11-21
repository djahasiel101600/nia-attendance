import * as SecureStore from 'expo-secure-store';

const BASE_URL = "https://attendance.caraga.nia.gov.ph";
const AUTH_BASE = 'https://accounts.nia.gov.ph';

class AuthService {
  session = null;

  login = async (employeeId, password) => {
    try {
      console.log('🔐 Attempting login...');
      
      // Step 1: Get login page to extract CSRF token
      const defaultHeaders = {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      };

      // Try initial login page and fallback to a few common variants if server returns non-200
      const tryGet = async (path) => {
        try {
          const res = await fetch(`${BASE_URL}${path}`, { headers: defaultHeaders });
          console.log(`🔎 GET ${path} -> ${res.status} ${res.url}`);
          const body = await res.text();
          return { res, body };
        } catch (e) {
          console.warn(`⚠️ GET ${path} failed:`, e.message || e);
          return { res: null, body: null };
        }
      };

      const tryGetAuth = async (path) => {
        try {
          const res = await fetch(`${AUTH_BASE}${path}`, { headers: defaultHeaders });
          console.log(`🔎 AUTH GET ${path} -> ${res.status} ${res.url}`);
          const body = await res.text();
          return { res, body };
        } catch (e) {
          console.warn(`⚠️ AUTH GET ${path} failed:`, e.message || e);
          return { res: null, body: null };
        }
      };

      const candidates = ['/Account/Login', '/Account/Login/', '/Account/Login?ReturnUrl=%2F', '/Attendance', '/'];
      let loginPageResponse = null;
      let html = null;
      let foundPath = null;


      // Try all candidate pages on the auth host and stop only when we can extract a CSRF token
      // Ensure extractToken is defined before use
      const extractToken = (source) => {
        if (!source) return null;
        const patterns = [
          /name=["']__RequestVerificationToken["']\s*.*?value=["']([^"']+)["']/i,
          /value=["']([^"']+)["']\s*.*?name=["']__RequestVerificationToken["']/i,
          /id=["']__RequestVerificationToken["']\s*.*?value=["']([^"']+)["']/i,
          /\"__RequestVerificationToken\"\s*:\s*\"([^\"]+)\"/i
        ];
        for (const p of patterns) {
          const m = source && source.match(p);
          if (m && m[1]) return m[1];
        }
        return null;
      };

      for (const p of candidates) {
        // Use the auth host for login page retrieval
        const { res, body } = await tryGetAuth(p);
        if (res) {
          loginPageResponse = res;
          html = body;
        }

        // Try to extract token from this response body immediately
        const tokenCandidate = extractToken(body);
        if (tokenCandidate) {
          html = body;
          foundPath = p;
          // use this response as the loginPageResponse
          break;
        }
      }

      if (!loginPageResponse) {
        console.error('🚨 Failed to GET any login page variants from server');
        throw new Error('Login page unreachable');
      }

      if (foundPath) {
        console.log(`✅ Token found on path ${foundPath}`);
      }

      const csrfToken = (function() {
        // reuse the same extractor defined above
        return extractToken(html);
      })();
      if (!csrfToken) {
        // Helpful debug: print a short snippet of the returned HTML for investigation
        console.error('🚨 Security token not found. HTML snippet:', html ? html.slice(0, 1200) : '<no body>');
        throw new Error('Security token not found');
      }

      console.log('✅ CSRF token extracted');
      
      // Step 2: Perform login
      const loginData = new URLSearchParams({
        'EmployeeId': employeeId,
        'Password': password,
        'RememberMe': 'false',
        '__RequestVerificationToken': csrfToken
      });

      // Include cookies returned from the initial GET in the POST to improve server acceptance
  const initialSetCookie = loginPageResponse.headers.get('set-cookie') || loginPageResponse.headers.get('Set-Cookie') || '';

      const postHeaders = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': `${AUTH_BASE}/Account/Login`,
        'Origin': AUTH_BASE,
        ...defaultHeaders
      };
      if (initialSetCookie) postHeaders['Cookie'] = initialSetCookie;

  // POST to the auth host (accounts.nia.gov.ph)
  const loginResponse = await fetch(`${AUTH_BASE}/Account/Login`, {
        method: 'POST',
        headers: postHeaders,
        body: loginData.toString()
      });

  console.log(`🔎 POST ${AUTH_BASE}/Account/Login -> ${loginResponse.status} ${loginResponse.url}`);
  const respSetCookie = loginResponse.headers.get('set-cookie') || loginResponse.headers.get('Set-Cookie') || '';
  if (respSetCookie) console.log('🔎 POST set-cookie:', respSetCookie.slice(0, 200));

      // Check if login was successful
      if (loginResponse.ok) {
        const responseText = await loginResponse.text();
        
  if (responseText.includes('Dashboard') || !responseText.includes('Login')) {
          // Store credentials securely
          await SecureStore.setItemAsync('employeeId', employeeId);
          await SecureStore.setItemAsync('password', password);
          
          // Store cookies from response
          const authCookies = loginResponse.headers.get('set-cookie') || loginResponse.headers.get('Set-Cookie') || initialSetCookie || '';
          if (authCookies) {
            // Save auth cookies (may be used for debugging)
            await SecureStore.setItemAsync('authCookies', authCookies);
          }

          // After successful auth, visit the attendance page to obtain attendance-site cookies
          try {
            const attendanceResp = await fetch(`${BASE_URL}/Attendance`, { headers: { ...defaultHeaders, Cookie: authCookies } });
            console.log(`🔎 POST-AUTH GET /Attendance -> ${attendanceResp.status} ${attendanceResp.url}`);
            const attendanceSet = attendanceResp.headers.get('set-cookie') || attendanceResp.headers.get('Set-Cookie') || '';
            const cookies = attendanceSet || authCookies;
            if (cookies) {
              await SecureStore.setItemAsync('sessionCookies', cookies);
            }
          } catch (e) {
            console.warn('⚠️ Failed to fetch attendance page after login:', e.message || e);
          }
          
          console.log('✅ Login successful');
          return true;
        }
      }
      
  // Helpful debug snippet when login fails
  console.error('❌ Login failed. Response snippet:', responseText ? responseText.slice(0, 800) : '<no body>');
  return false;
      
    } catch (error) {
      console.error('🚨 Login error:', error);
      return false;
    }
  };

  logout = async () => {
    await SecureStore.deleteItemAsync('employeeId');
    await SecureStore.deleteItemAsync('password');
    await SecureStore.deleteItemAsync('sessionCookies');
    this.session = null;
  };

  getStoredCredentials = async () => {
    try {
      const employeeId = await SecureStore.getItemAsync('employeeId');
      const password = await SecureStore.getItemAsync('password');
      return { employeeId, password };
    } catch (error) {
      return { employeeId: null, password: null };
    }
  };

  getSessionCookies = async () => {
    return await SecureStore.getItemAsync('sessionCookies');
  };
}

export default new AuthService();