import {apiClient} from '@/lib/api/apiClient'
export interface Unit{id:number;externalId:string;name:string;symbol:string;description:string|null;allowsDecimals:boolean;isActive:boolean}
export interface Product{id:number;externalId:string;code:string;name:string;description:string|null;externalUnitId:string;price:number;isActive:boolean}
export interface Page<T>{items:T[];pagination:{page:number;pageSize:number;totalItems:number;totalPages:number}}
export type UnitInput=Omit<Unit,'id'|'externalId'>;export type ProductInput=Omit<Product,'id'|'externalId'|'code'>
const resource=<T,I>(path:string)=>({list:async(search='')=>(await apiClient.get<Page<T>>(path,{params:{search:search||undefined,page:1,pageSize:100}})).data,create:async(input:I)=>(await apiClient.post(path,input)).data,update:async(id:string,input:I)=>(await apiClient.put(`${path}/${id}`,input)).data,remove:async(id:string)=>(await apiClient.delete(`${path}/${id}`)).data})
export const unitsApi=resource<Unit,UnitInput>('/api/units');export const productsApi=resource<Product,ProductInput>('/api/products')
