// services/AuthService.js
import * as SecureStore from 'expo-secure-store';
import { API_CONFIG, STORAGE_KEYS } from '../constants/config';

const BASE_URL = API_CONFIG.BASE_URL;
const AUTH_BASE = API_CONFIG.AUTH_BASE_URL;

/**
 * Authentication service for handling user login and session management
 */
class AuthService {
  session = null;
  memoryCookies = null;

  /**
   * Authenticates a user with employee ID and password
   * @param {string} employeeId - The employee's ID
   * @param {string} password - The employee's password
   * @returns {Promise<boolean>} True if login successful, false otherwise
   */
  login = async (employeeId, password) => {
    try {
      const defaultHeaders = {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      };

      // Step 1: Get login page
      const loginPageResponse = await fetch(`${AUTH_BASE}/Account/Login?ReturnUrl=${encodeURIComponent(BASE_URL + '/')}`, { 
        headers: defaultHeaders 
      });
      
      if (!loginPageResponse.ok) {
        throw new Error(`Failed to load login page: ${loginPageResponse.status}`);
      }
      
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
        console.error('Security token not found in login page');
        throw new Error('Security token not found');
      }
      
      // Step 2: Perform login
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
      
      const responseText = await loginResponse.text();
      
      // Check if login was successful
      const isSuccessful = loginResponse.status === 302 || 
                          !responseText.includes('Login') || 
                          responseText.includes('Dashboard');
      
      if (isSuccessful) {
        // Store only employee ID, not password
        await SecureStore.setItemAsync(STORAGE_KEYS.EMPLOYEE_ID, employeeId);
        
        // Try to get cookies if available
        const cookies = loginResponse.headers.get('set-cookie') || loginResponse.headers.get('Set-Cookie') || '';
        if (cookies) {
          await SecureStore.setItemAsync(STORAGE_KEYS.SESSION_COOKIES, cookies);
          this.memoryCookies = cookies;
        }
        
        return true;
      } else {
        return false;
      }
      
    } catch (error) {
      console.error('Login error:', error.message);
      return false;
    }
  };

  /**
   * Logs out the current user and clears stored credentials
   * @returns {Promise<void>}
   */
  logout = async () => {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.EMPLOYEE_ID);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.SESSION_COOKIES);
    this.session = null;
    this.memoryCookies = null;
  };

  /**
   * Retrieves stored credentials from secure storage
   * @returns {Promise<{employeeId: string | null}>} Object containing employee ID
   */
  getStoredCredentials = async () => {
    try {
      const employeeId = await SecureStore.getItemAsync(STORAGE_KEYS.EMPLOYEE_ID);
      return { employeeId };
    } catch (error) {
      return { employeeId: null };
    }
  };

  /**
   * Retrieves stored session cookies
   * @returns {Promise<string | null>} Session cookies or null
   */
  getSessionCookies = async () => {
    try {
      const cookies = await SecureStore.getItemAsync(STORAGE_KEYS.SESSION_COOKIES);
      if (cookies) {
        return cookies;
      }
      return this.memoryCookies;
    } catch (error) {
      return this.memoryCookies;
    }
  };

  /**
   * Tests if the current user has API access
   * @param {string} employeeId - The employee's ID
   * @returns {Promise<boolean>} True if API is accessible, false otherwise
   */
  testAccess = async (employeeId) => {
    try {
      // Use the same exact call as the working dashboard
      const response = await fetch(`${BASE_URL}/Attendance/IndexData/${new Date().getFullYear()}?month=${new Date().toLocaleString('default', { month: 'long' })}&eid=${employeeId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': `${BASE_URL}/Attendance`
        },
        body: 'draw=1&start=0&length=1' // Minimal payload
      });
      
      // Consider it successful if we get any 2xx status
      return response.status >= 200 && response.status < 300;
    } catch (error) {
      console.error('API test error:', error.message);
      return false;
    }
  };
}

export default new AuthService();