// services/AuthService.js - FIXED API TEST
import * as SecureStore from 'expo-secure-store';

const BASE_URL = "https://attendance.caraga.nia.gov.ph";
const AUTH_BASE = 'https://accounts.nia.gov.ph';

class AuthService {
  session = null;
  memoryCookies = null;

  login = async (employeeId, password) => {
    try {
      console.log('🔐 Attempting login...');
      
      const defaultHeaders = {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      };

      // Step 1: Get login page
      console.log('📡 Getting login page...');
      const loginPageResponse = await fetch(`${AUTH_BASE}/Account/Login?ReturnUrl=${encodeURIComponent(BASE_URL + '/')}`, { 
        headers: defaultHeaders 
      });
      
      console.log(`🔎 GET Login Page -> ${loginPageResponse.status}`);
      
      const html = await loginPageResponse.text();

      // Extract CSRF token
      const extractToken = (source) => {
        if (!source) return null;
        const patterns = [
          /name="__RequestVerificationToken"[^>]*value="([^"]*)"/i,
          /name='__RequestVerificationToken'[^>]*value='([^']*)'/i,
        ];
        for (const p of patterns) {
          const m = source && source.match(p);
          if (m && m[1]) return m[1];
        }
        return null;
      };

      const csrfToken = extractToken(html);
      if (!csrfToken) {
        console.error('🚨 Security token not found');
        throw new Error('Security token not found');
      }

      console.log('✅ CSRF token extracted');
      
      // Step 2: Perform login
      console.log('📡 Performing login...');
      
      const postData = `__RequestVerificationToken=${encodeURIComponent(csrfToken)}&EmployeeID=${encodeURIComponent(employeeId)}&Password=${encodeURIComponent(password)}&RememberMe=false`;
      
      const postHeaders = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': `${AUTH_BASE}/Account/Login?ReturnUrl=${encodeURIComponent(BASE_URL + '/')}`,
        'Origin': AUTH_BASE,
        ...defaultHeaders
      };

      const loginResponse = await fetch(`${AUTH_BASE}/Account/Login`, {
        method: 'POST',
        headers: postHeaders,
        body: postData,
        redirect: 'manual'
      });

      console.log(`🔎 POST Login -> ${loginResponse.status}`);
      
      const responseText = await loginResponse.text();
      
      // Check if login was successful
      const isSuccessful = loginResponse.status === 302 || 
                          !responseText.includes('Login') || 
                          responseText.includes('Dashboard');
      
      if (isSuccessful) {
        console.log('✅ Login successful');
        
        // Store credentials
        await SecureStore.setItemAsync('employeeId', employeeId);
        await SecureStore.setItemAsync('password', password);
        
        // Try to get cookies if available
        const cookies = loginResponse.headers.get('set-cookie') || loginResponse.headers.get('Set-Cookie') || '';
        if (cookies) {
          await SecureStore.setItemAsync('sessionCookies', cookies);
          this.memoryCookies = cookies;
        }
        
        return true;
      } else {
        console.log('❌ Login failed');
        return false;
      }
      
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
    this.memoryCookies = null;
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
    try {
      const cookies = await SecureStore.getItemAsync('sessionCookies');
      if (cookies) {
        return cookies;
      }
      return this.memoryCookies;
    } catch (error) {
      return this.memoryCookies;
    }
  };

  // SIMPLE API TEST - Just check if we can make any API call
  testAccess = async (employeeId) => {
    try {
      console.log('🧪 Testing API access with simple request...');
      
      // Use the same exact call as your working dashboard
      const response = await fetch(`${BASE_URL}/Attendance/IndexData/${new Date().getFullYear()}?month=${new Date().toLocaleString('default', { month: 'long' })}&eid=${employeeId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': `${BASE_URL}/Attendance`
        },
        body: 'draw=1&start=0&length=1' // Minimal payload
      });
      
      console.log(`🧪 API test -> ${response.status}`);
      
      // Consider it successful if we get any 2xx status
      const success = response.status >= 200 && response.status < 300;
      console.log('🧪 API access:', success ? 'SUCCESS' : `FAILED (${response.status})`);
      
      return success;
    } catch (error) {
      console.error('🧪 API test error:', error);
      return false;
    }
  };
}

export default new AuthService();