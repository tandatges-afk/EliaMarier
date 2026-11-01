import {transactionVpsPath} from './vps-database';
import {DeliveryError} from './delivery-access';
export type ConditionalAction<T>={kind:'write';value:T}|{kind:'return';value:T};
export async function conditionalDeliveryMutation<T extends object>(
 path:string,updater:(previous:T|null)=>ConditionalAction<T>,_attempts=4
):Promise<{updated:boolean;value:T}>{
 if(!/^[A-Za-z0-9_/-]+$/.test(path)||path.includes('..')||path.startsWith('/'))
  throw new DeliveryError(400,'DELIVERY_BAD_PATH','Đường dẫn dữ liệu không hợp lệ');
 let result:{updated:boolean;value:T}|null=null;
 await transactionVpsPath(path,previous=>{
  const action=updater(previous as T|null);
  result={updated:action.kind==='write',value:action.value};
  return action.kind==='write'?action.value:undefined;
 });
 if(!result)throw new DeliveryError(503,'DELIVERY_CAS_WRITE','Không cập nhật được dữ liệu');
 return result;
}
