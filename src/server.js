import express from 'express';
import crypto from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { z } from 'zod';
import { getJson, putJson } from './store.js';
import { ZeppRestProvider } from './providers/zepp-rest.js';

const app=express(); app.use(express.json({limit:'2mb'}));
const PORT=Number(process.env.PORT||8787);
const provider=new ZeppRestProvider();
const stateStore=new Map();
const b64=b=>b.toString('base64url');
const ui=`<!doctype html><meta charset="utf-8"><style>body{font-family:system-ui;margin:0;padding:18px;background:#0b0d10;color:#f5f7fa}h2{margin-top:0}.card{padding:14px;border:1px solid #2a3038;border-radius:14px;margin:10px 0;background:#12161b}.v{font-size:24px;font-weight:700}.muted{color:#9aa4af}</style><h2>⌚ Amazfit AI Coach</h2><div class="card"><div class="muted">Conexão</div><div id="status" class="v">Consultando…</div></div><div class="card"><div class="muted">Dados disponíveis</div><div id="data">Use os comandos do Amazfit AI Coach para consultar seus dados.</div></div>`;

const mcp=new McpServer({name:'amazfit-ai-coach',version:'0.2.0'},{instructions:'Amazfit AI Coach. Use only authorized Zepp/Amazfit data returned by tools. Never invent measurements. Clearly label derived metrics and missing data.'});
registerAppResource(mcp,'amazfit-ui','ui://amazfit/dashboard.html',{},async()=>({contents:[{uri:'ui://amazfit/dashboard.html',mimeType:RESOURCE_MIME_TYPE,text:ui}]}));
function result(data){return {content:[{type:'text',text:JSON.stringify(data)}],structuredContent:data};}
async function token(){return (await getJson('zepp-token.json',{})).access_token||null;}

registerAppTool(mcp,'amazfit_connection_status',{title:'Connection status',description:'Check whether the Amazfit/Zepp data source is connected.',inputSchema:{},_meta:{'ui/resourceUri':'ui://amazfit/dashboard.html',readOnlyHint:true}},async()=>result({configured:provider.configured(),connected:Boolean(await token())}));
registerAppTool(mcp,'amazfit_profile',{title:'Amazfit profile',description:'Get the connected Amazfit/Zepp profile.',inputSchema:{},_meta:{'ui/resourceUri':'ui://amazfit/dashboard.html',readOnlyHint:true}},async()=>{const t=await token();if(!t)return result({connected:false});return result(await provider.profile(t));});
registerAppTool(mcp,'amazfit_health_summary',{title:'Health summary',description:'Get available activity and sleep data for a date range.',inputSchema:{startDate:z.string(),endDate:z.string()},_meta:{'ui/resourceUri':'ui://amazfit/dashboard.html',readOnlyHint:true}},async({startDate,endDate})=>{const t=await token();if(!t)return result({connected:false});const [a,s]=await Promise.all([provider.activities(t,startDate,endDate),provider.sleep(t,startDate,endDate)]);return result({startDate,endDate,activities:a,sleep:s});});
registerAppTool(mcp,'amazfit_heart_rate',{title:'Heart rate',description:'Get available heart-rate data for a date range.',inputSchema:{startDate:z.string(),endDate:z.string()},_meta:{'ui/resourceUri':'ui://amazfit/dashboard.html',readOnlyHint:true}},async({startDate,endDate})=>{const t=await token();if(!t)return result({connected:false});return result({startDate,endDate,heartRate:await provider.heartRate(t,startDate,endDate)});});

app.get('/healthz',(req,res)=>res.json({ok:true,service:'amazfit-ai-coach',version:'0.2.0',providerConfigured:provider.configured()}));
app.get('/connect/zepp',(req,res)=>{if(!provider.configured())return res.status(503).send('Servidor ainda não recebeu as credenciais oficiais da aplicação Zepp.');const state=b64(crypto.randomBytes(24));stateStore.set(state,Date.now());const u=new URL(process.env.ZEPP_AUTH_URL);u.searchParams.set('client_id',process.env.ZEPP_CLIENT_ID);u.searchParams.set('response_type','code');u.searchParams.set('redirect_uri',`${process.env.BASE_URL}/oauth/zepp/callback`);u.searchParams.set('scope',process.env.ZEPP_SCOPES||'profile activity sleep heartrate');u.searchParams.set('state',state);res.redirect(u);});
app.get('/oauth/zepp/callback',async(req,res)=>{try{if(!req.query.state||!stateStore.has(req.query.state))return res.status(400).send('Invalid state');stateStore.delete(req.query.state);const body=new URLSearchParams({grant_type:'authorization_code',code:String(req.query.code||''),redirect_uri:`${process.env.BASE_URL}/oauth/zepp/callback`,client_id:process.env.ZEPP_CLIENT_ID,client_secret:process.env.ZEPP_CLIENT_SECRET});const r=await fetch(process.env.ZEPP_TOKEN_URL,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});const j=await r.json();if(!r.ok)throw new Error(JSON.stringify(j));await putJson('zepp-token.json',j);res.send('<h2>Amazfit conectado.</h2><p>Você pode fechar esta janela e voltar ao ChatGPT.</p>');}catch(e){res.status(500).send(`Falha na conexão: ${String(e.message)}`);}});
app.get('/mcp-info',(req,res)=>res.json({name:'Amazfit AI Coach',mcp:`${process.env.BASE_URL||`http://localhost:${PORT}`}/mcp`}));
app.all('/mcp',async(req,res)=>{const transport=new StreamableHTTPServerTransport({sessionIdGenerator:undefined});res.on('close',()=>transport.close());await mcp.connect(transport);await transport.handleRequest(req,res,req.body);});
app.listen(PORT,()=>console.log(`Amazfit AI Coach v0.2.0 listening on :${PORT}`));
