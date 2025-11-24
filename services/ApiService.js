// services/ApiService.js
import { API_CONFIG } from '../constants/config';

const BASE_URL = API_CONFIG.BASE_URL;

class ApiService {
  
  getAttendanceData = async (employeeId, year = null, month = null) => {
    try {
      if (!year) year = new Date().getFullYear();
      if (!month) month = new Date().toLocaleString('default', { month: 'long' });

      const url = `${BASE_URL}/Attendance/IndexData/${year}?month=${month}&eid=${employeeId}`;
      
      const payload = {
        "draw": "1",
        "columns[0][data]": "Id",
        "columns[0][name]": "",
        "columns[0][searchable]": "true",
        "columns[0][orderable]": "true",
        "columns[0][search][value]": "",
        "columns[0][search][regex]": "false",
        "columns[1][data]": "DateTimeStamp",
        "columns[1][name]": "",
        "columns[1][searchable]": "true",
        "columns[1][orderable]": "true",
        "columns[1][search][value]": "",
        "columns[1][search][regex]": "false",
        "columns[2][data]": "Temperature",
        "columns[2][name]": "",
        "columns[2][searchable]": "true",
        "columns[2][orderable]": "true",
        "columns[2][search][value]": "",
        "columns[2][search][regex]": "false",
        "columns[3][data]": "Name",
        "columns[3][name]": "",
        "columns[3][searchable]": "true",
        "columns[3][orderable]": "true",
        "columns[3][search][value]": "",
        "columns[3][search][regex]": "false",
        "columns[4][data]": "EmployeeID",
        "columns[4][name]": "",
        "columns[4][searchable]": "true",
        "columns[4][orderable]": "true",
        "columns[4][search][value]": "",
        "columns[4][search][regex]": "false",
        "columns[5][data]": "MachineName",
        "columns[5][name]": "",
        "columns[5][searchable]": "true",
        "columns[5][orderable]": "true",
        "columns[5][search][value]": "",
        "columns[5][search][regex]": "false",
        "order[0][column]": "1",
        "order[0][dir]": "desc",
        "start": "0",
        "length": "50",
        "search[value]": "",
        "search[regex]": "false"
      };

      const formData = new URLSearchParams();
      for (const key in payload) {
        formData.append(key, payload[key]);
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': `${BASE_URL}/Attendance`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        return this.processAttendanceData(data);
      } else {
        throw new Error(`API error: ${response.status}`);
      }
    } catch (error) {
      console.error('🚨 API Error:', error);
      throw error;
    }
  };

  processAttendanceData = (apiData) => {
    if (!apiData || !apiData.data) {
      return [];
    }

    return apiData.data.map(record => ({
      id: record.Id,
      dateTime: this.parseNetDate(record.DateTimeStamp),
      temperature: record.Temperature ? parseFloat(record.Temperature) : null,
      employeeId: record.EmployeeID,
      employeeName: record.Name,
      machineName: record.MachineName,
      status: record.AccessResult === 1 ? "ACCESS_GRANTED" : "ACCESS_DENIED"
    }));
  };

  parseNetDate = (netDateString) => {
    // Convert .NET Date format to JavaScript Date
    const match = netDateString.match(/\/Date\((\d+)\)\//);
    if (match) {
      const timestamp = parseInt(match[1]);
      return new Date(timestamp);
    }
    return new Date();
  };


  getSignalRToken = async () => {
    try {
      console.log('🔧 Fetching SignalR connection token...');
      
      // Method 1: Try to extract from attendance page cookies
      const response = await fetch(`${BASE_URL}/Attendance`, {
        method: 'GET',
        headers: {
          'Referer': `${BASE_URL}/Attendance`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      // Get cookies from response
      const setCookieHeader = response.headers.get('set-cookie');
      
      if (setCookieHeader) {
        // Look for connection token in cookies
        const tokenPatterns = [
          /connectionToken=([^;]+)/,
          /SignalR\.ConnectionToken=([^;]+)/,
          /__SignalRToken=([^;]+)/
        ];
        
        for (const pattern of tokenPatterns) {
          const match = setCookieHeader.match(pattern);
          if (match && match[1]) {
            console.log('✅ SignalR token found in cookies');
            return match[1];
          }
        }
      }

      // Method 2: Try SignalR negotiation
      console.log('🔄 Trying SignalR negotiation...');
      return await this._trySignalRNegotiation();
      
    } catch (error) {
      console.error('🚨 Error getting SignalR token:', error);
      return null;
    }
  };

  _trySignalRNegotiation = async () => {
    try {
      const negotiateUrl = `${BASE_URL}/signalr/negotiate`;
      
      const params = new URLSearchParams({
        'clientProtocol': '2.1',
        'connectionData': '[{"name":"biohub"}]',
        '_': Date.now().toString()
      });

      const response = await fetch(`${negotiateUrl}?${params}`, {
        method: 'GET',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': `${BASE_URL}/Attendance`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.ConnectionToken) {
          console.log('✅ SignalR token from negotiation');
          return data.ConnectionToken;
        }
        
        if (data.Url) {
          const tokenMatch = data.Url.match(/connectionToken=([^&]+)/);
          if (tokenMatch) {
            console.log('✅ SignalR token from URL');
            return tokenMatch[1];
          }
        }
      }
      
      console.log('❌ No token found in negotiation');
      return null;
      
    } catch (error) {
      console.error('🚨 SignalR negotiation failed:', error);
      return null;
    }
  };


}

export default new ApiService();