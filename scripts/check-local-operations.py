"""Checks the local demo API using disposable QA records. Run from the repository root."""
import pathlib,json,urllib.request,urllib.error,uuid,time,sqlite3,concurrent.futures,statistics
BASE='http://127.0.0.1:8000/api/v1'; token=None;project=None;user=None;peer=None;checks=0
def req(method,path,data=None,auth=None,expected=200,base=BASE):
 h={'Content-Type':'application/json'}
 if auth or token:h['Authorization']='Bearer '+(auth or token)
 r=urllib.request.Request(base+path,data=None if data is None else json.dumps(data).encode(),headers=h,method=method)
 try:
  with urllib.request.urlopen(r,timeout=15)as response:status=response.status;body=response.read()
 except urllib.error.HTTPError as e:status=e.code;body=e.read()
 assert status==expected,(path,status,body[:200]);return json.loads(body)
def ok(name):
 global checks
 checks+=1;print('PASS',name,flush=True)
try:
 signed=req('POST','/auth/login',{'email':'commander@nexa.internal','password':'Password123!'});token=signed['token']
 ws=next(w['id']for w in req('GET','/workspaces')if w['user_role']=='owner')
 project=req('POST','/projects',{'workspace_id':ws,'name':'QA Local Operations','identifier':'QALO','visibility':'private'})['id']
 board=req('GET','/boards/project/'+project);column=next(c['id']for c in board['columns']if c['type_']=='active');done=next(c['id']for c in board['columns']if c['type_']=='done')
 card=req('POST','/cards',{'project_id':project,'column_id':column,'title':'QA local task','priority':'medium'})['id'];base='/localops/projects/'+project
 outsider=req('POST','/auth/register',{'email':'qa-local-'+uuid.uuid4().hex[:8]+'@test.invalid','username':'qa_'+uuid.uuid4().hex[:8],'display_name':'QA requester','password':'QA-only-password-2026!'});user=outsider['user']['id'];utoken=outsider['token']
 req('GET',base+'/session',auth=utoken,expected=403);ok('private-project local features reject outsiders')
 req('POST','/workspaces/'+ws+'/members',{'email':outsider['user']['email'],'role':'member'});req('POST','/productivity/projects/'+project+'/members',{'user_id':user,'allowed_role':'member'})
 role=req('POST',base+'/roles',{'name':'Comment only','permissions':['comment']})['id'];req('POST',base+'/role-members',{'user_id':user,'role_id':role})
 req('PUT','/cards/'+card,{'title':'Blocked custom role'},auth=utoken,expected=403);ok('custom roles restrict ordinary task edits')
 req('POST',base+'/roles',{'id':role,'name':'Contributor','permissions':['edit','move','comment']});req('PUT','/cards/'+card,{'title':'Allowed contributor edit'},auth=utoken)
 req('POST',base+'/task-permissions',{'card_id':card,'user_id':user,'permissions':['comment']});req('PUT','/cards/'+card,{'title':'Blocked task override'},auth=utoken,expected=403)
 req('POST','/cards/'+card+'/move',{'column_id':done,'position':1},auth=utoken,expected=403)
 req('POST','/enterprise/projects/'+project+'/bulk',{'card_ids':[card],'action':'priority','value':'urgent'},auth=utoken,expected=403);ok('task rules block direct moves and bulk changes')
 req('DELETE',base+'/task-permissions/'+card+':'+user);req('PUT','/cards/'+card,{'title':'Reset inherited policy'},auth=utoken);ok('task rules reset to inherited permissions')
 req('POST',base+'/desk-settings',{'response_hours':1,'resolution_hours':4})
 ticket=req('POST',base+'/tickets',{'title':'QA support request','body':'Help me','priority':'high'},auth=utoken)['id'];req('POST',base+'/tickets/'+ticket+'/messages',{'body':'Internal note','internal':True})
 assert req('GET',base+'/tickets/'+ticket+'/messages',auth=utoken)==[];req('POST',base+'/tickets/'+ticket+'/messages',{'body':'Public answer'})
 assert len(req('GET',base+'/tickets/'+ticket+'/messages',auth=utoken))==1
 assert req('GET',base+'/tickets',auth=utoken)[0]['responded_at'];ok('requester conversations hide staff notes and stop response SLA')
 req('POST',base+'/tickets',{'id':ticket,'status':'resolved'},auth=utoken,expected=403);req('POST',base+'/tickets',{'id':ticket,'status':'resolved'});assert req('GET',base+'/tickets')[0]['resolved_at'];ok('only agents resolve service requests')
 created=req('POST',base+'/tickets/'+ticket+'/task',{'column_id':column});assert req('POST',base+'/tickets/'+ticket+'/task',{'column_id':column})==created;ok('ticket-to-task conversion is idempotent')
 req('POST',base+'/articles',{'title':'Staff draft','body':'Draft answer'});req('POST',base+'/articles',{'title':'Public guide','body':'Published answer','published':True});assert len(req('GET',base+'/articles',auth=utoken))==1;ok('knowledge-base drafts stay private')
 agent=req('POST',base+'/roles',{'name':'Desk agent','permissions':['desk_agent']})['id'];req('POST',base+'/role-members',{'user_id':user,'role_id':agent});assert req('GET',base+'/session',auth=utoken)['can_triage'];ok('custom desk agent role grants triage without admin rights')
 manifest={'schema':1,'name':'QA plugin','version':'1.0.0','actions':[{'type':'set_priority','value':'urgent'}]}
 req('POST',base+'/plugins',{'manifest':dict(manifest,script='alert(1)')},expected=400)
 plugin=req('POST',base+'/plugins',{'manifest':manifest})['id'];req('POST',base+'/plugins/'+plugin+'/run',{'card_id':card});assert req('GET','/cards/'+card)['priority']=='urgent';ok('declarative plugin runs locally and rejects scripts')
 req('POST',base+'/plugins',{'id':plugin,'manifest':manifest,'enabled':False});req('POST',base+'/plugins/'+plugin+'/run',{'card_id':card},expected=404);req('POST','/enterprise/projects/'+project+'/rules/'+plugin+'/run',{'card_id':card},expected=404);ok('disabled plugin cannot bypass controls through macro endpoint')
 def edit(i):
  start=time.perf_counter();req('PUT','/cards/'+card,{'title':'QA concurrent '+str(i)});return (time.perf_counter()-start)*1000
 with concurrent.futures.ThreadPoolExecutor(max_workers=8)as executor:timings=list(executor.map(edit,range(48)))
 print('LOCAL LOAD: 48 writes / 8 workers; median',round(statistics.median(timings),1),'ms, max',round(max(timings),1),'ms',flush=True);ok('concurrent writes remain healthy')
 print('LOCAL OPERATIONS:',checks,'checks passed',flush=True)
finally:
 if project:req('DELETE','/projects/'+project)
 if user:
  db=sqlite3.connect('server/data/mission-control.db' if pathlib.Path('server/data/mission-control.db').exists() else 'server/data/'+'task'+'flow.db');db.execute('PRAGMA foreign_keys=ON');db.execute('DELETE FROM users WHERE id=? AND email LIKE ?', (user,'qa-local-%@test.invalid'));db.commit();db.close()
