import axios from 'axios';

let baseURL = 'http://localhost:3001';
const isElectron = !!(window as any).electronAPI;

console.log('isElectron:', isElectron);

let api: any;

if (isElectron) {
  const portPromise = new Promise((resolve) => {
    (window as any).electronAPI.onBackendPort((port: number) => {
      console.log(`Received Electron backend port: ${port}`);
      baseURL = `http://localhost:${port}`;
      console.log(`Using Electron backend at ${baseURL}`);
      resolve(baseURL);
    });
  });

  api = await portPromise.then(() => {
    console.log('Creating axios instance with:', baseURL);
    return axios.create({ baseURL });
  });
} else {
  console.log('Using web backend at:', baseURL);
  api = axios.create({ baseURL });
}

export async function getTest() {
  console.log('Sending request to:', baseURL + '/api/test');
  return api.get('/api/test');
}

// export async function postChat(data) {
//   return api.post('/api/chat', data);
// }
