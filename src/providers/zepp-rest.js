export class ZeppRestProvider {
  constructor(env = process.env) {
    this.base = (env.ZEPP_API_BASE || '').replace(/\/$/, '');
    this.clientId = env.ZEPP_CLIENT_ID || '';
    this.clientSecret = env.ZEPP_CLIENT_SECRET || '';
  }
  configured() { return Boolean(this.base && this.clientId && this.clientSecret); }
  async request(path, accessToken, params = {}) {
    if (!this.base) throw new Error('ZEPP_API_BASE not configured');
    const url = new URL(this.base + path);
    for (const [k,v] of Object.entries(params)) if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    const r = await fetch(url, {headers:{Authorization:`Bearer ${accessToken}`,Accept:'application/json'}});
    const body = await r.text();
    if (!r.ok) throw new Error(`Zepp API ${r.status}: ${body.slice(0,500)}`);
    try{return JSON.parse(body);}catch{return {raw:body};}
  }
  profile(token){return this.request('/users/-/profile',token);}
  activities(token,startDate,endDate){return this.request('/users/-/activities',token,{startDate,endDate,interval:'daily'});}
  sleep(token,startDate,endDate){return this.request('/users/-/sleep',token,{startDate,endDate,interval:'daily'});}
  heartRate(token,startDate,endDate){return this.request('/users/-/heartrates',token,{startDate,endDate});}
}
