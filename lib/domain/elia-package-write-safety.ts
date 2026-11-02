/** Safe rules for package-linked wardrobe reservations; no Firebase dependency. */
export type WardrobePackageEntry = {id:string;itemId:string};

/** Identity is a dress + package entry, not its dates. Date changes retain the same booking ID. */
export function retiringWardrobeEntries<T extends WardrobePackageEntry>(
  before:readonly T[],after:readonly WardrobePackageEntry[],cancelled:boolean
):T[]{
  const remaining = new Set(cancelled?[]:after.map(x=>`${x.itemId}:${x.id}`));
  return before.filter(x=>!remaining.has(`${x.itemId}:${x.id}`));
}

export function linkedWardrobeEditCode(
  isLinked:boolean,changesFields:boolean,newStatus:unknown
):'PACKAGE_LINKED_FIELDS'|'PACKAGE_LINKED_CANCEL'|null{
  if(!isLinked)return null;
  if(changesFields)return 'PACKAGE_LINKED_FIELDS';
  if(newStatus==='cancelled')return 'PACKAGE_LINKED_CANCEL';
  return null;
}

export function wardrobeHasUnreturnedPickup(status:unknown):boolean{
  return status==='picked_up';
}
