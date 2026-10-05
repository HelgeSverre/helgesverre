import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildActivityPanels, loadActivity, localDay, collectActivity } from '../src/activity.mjs';
const config = { user: 'HelgeSverre', exclude: ['HelgeSverre/helgesverre'], pin: [], names: {} };
const now = new Date('2026-10-05T14:00:00Z');
const event = (at, repo = 'org/project', kind = 'commit', title = 'Fix something') => ({at, repo, kind, title, url: 'https://github.com/org/project'});
test('Oslo dates cross UTC midnight and respect DST', () => {
  assert.equal(localDay('2026-10-04T23:30:00Z'), '2026-10-05');
  assert.equal(localDay('2026-12-04T23:30:00Z'), '2026-12-05');
});
test('programme collapses commit bursts, preserves releases and true times', () => {
  const p = buildActivityPanels({ fetchedAt: now.toISOString(), events: [event('2026-10-05T12:30:00Z'), event('2026-10-05T12:00:00Z'), event('2026-10-05T13:00:00Z', 'org/project', 'release', 'v2')] }, config, now);
  assert.equal(p.programme.length, 2);
  assert.equal(p.programme[0].time, '15:00');
  assert.equal(p.projects[0].desc, 'Released v2');
  assert.equal(p.projects[0].days.at(-1), 3);
});
test('active days outrank a single commit burst; pins cannot invent activity', () => {
  const events = Array.from({length:100}, () => event('2026-10-05T12:00:00Z', 'org/burst'));
  for (let i=1;i<=5;i++) events.push(event(`2026-10-0${i}T12:00:00Z`, 'org/steady'));
  const p = buildActivityPanels({fetchedAt:now.toISOString(),events}, {...config,pin:['org/absent']},now);
  assert.equal(p.projects[0].repo,'org/steady');
  assert.equal(p.projects.length,2);
});
test('API failure retains dated cache; missing cache fails closed', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'profile-'));
  const cachePath = join(dir,'cache.json');
  const request = async () => { throw new Error('offline'); };
  try {
    await assert.rejects(loadActivity({config,now,cachePath,request}), /offline/);
    await writeFile(cachePath,JSON.stringify({version:1,fetchedAt:'2026-10-01T12:00:00Z',events:[]}));
    const cached=await loadActivity({config,now,cachePath,request});
    assert.equal(cached.stale,true);
    assert.match(buildActivityPanels(cached,config,now).status,/CACHED 01 OCT/);
  } finally { await rm(dir,{recursive:true}); }
});
test('collection filters private/profile/bot activity and uses merged_at', async () => {
  const commit = (repo, privateRepo=false, author='HelgeSverre') => ({sha:repo,repository:{full_name:repo,private:privateRepo},author:{login:author},commit:{message:'Fix',committer:{date:now.toISOString()}},html_url:'https://github.com/x'});
  const request = async url => ({ok:true,json:async()=> url.includes('/search/commits') ? {total_count:4,items:[commit('org/public'),commit('org/private',true),commit('HelgeSverre/helgesverre'),commit('org/bot',false,'a[bot]')]} : url.includes('/search/issues') ? {total_count:1,items:[{repository_url:'https://api.github.com/repos/org/public',number:1,title:'Merged change',html_url:'https://github.com/org/public/pull/1'}]} : url.includes('/pulls/') ? {base:{repo:{private:false}},merged_at:'2026-10-05T10:00:00Z'} : []});
  const result=await collectActivity({config,now,request});
  assert.equal(result.events.length,2);
  assert.equal(result.events.find(e=>e.kind==='merge').at,'2026-10-05T10:00:00Z');
});
