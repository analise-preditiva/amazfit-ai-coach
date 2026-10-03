import fs from 'node:fs/promises';
import path from 'node:path';
const DIR = process.env.DATA_DIR || './data';
await fs.mkdir(DIR,{recursive:true});
export async function getJson(name, fallback=null){try{return JSON.parse(await fs.readFile(path.join(DIR,name),'utf8'));}catch{return fallback;}}
export async function putJson(name,value){await fs.writeFile(path.join(DIR,name),JSON.stringify(value,null,2),'utf8');}
