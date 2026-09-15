import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/AppShell'
import { DataState } from '@/components/data/DataState'
import { Pagination } from '@/components/data/Pagination'
import { customerService } from '@/features/customers/services/customerService'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { reportApi, type ReportRow, type ReportType } from '../api/reportApi'

const labels: Record<ReportType,string> = { projects:'Proyectos', deliveries:'Entregas', 'customers-pending-contact':'Contactos pendientes', 'commercial-activity':'Actividad comercial' }
const date=(value:unknown)=>value?new Date(String(value)).toLocaleString('es-BO'):'—'

export function ReportsPage(){
 const {user}=useAuth(),isSeller=user?.roles.some(role=>role.toLowerCase()==='seller')??false
 const [type,setType]=useState<ReportType>('projects'),[from,setFrom]=useState(''),[to,setTo]=useState(''),[seller,setSeller]=useState(''),[page,setPage]=useState(1)
 const sellers=useQuery({queryKey:['sellers'],queryFn:customerService.sellers,enabled:!isSeller})
 const query=useQuery({queryKey:['report',type,from,to,seller,page],queryFn:()=>reportApi.get(type,{from:from||undefined,to:to||undefined,sellerExternalId:isSeller?undefined:seller||undefined,page})})
 return <main className="customers-content"><PageHeader eyebrow="Análisis" title="Reportes" description={isSeller?'Consulta únicamente tu actividad comercial.':'Consulta el desempeño comercial y operativo.'}/><nav className="activity-tabs">{(Object.keys(labels)as ReportType[]).map(item=><button className={type===item?'active':''} key={item} onClick={()=>{setType(item);setPage(1)}}>{labels[item]}</button>)}</nav><div className="customer-toolbar"><input aria-label="Desde" type="date" value={from} onChange={e=>setFrom(e.target.value)}/><input aria-label="Hasta" type="date" value={to} onChange={e=>setTo(e.target.value)}/>{!isSeller&&<select value={seller} onChange={e=>setSeller(e.target.value)}><option value="">Todos los vendedores</option>{sellers.data?.map(item=><option key={item.externalId} value={item.externalId}>{item.displayName}</option>)}</select>}</div><section className="customer-table-card"><DataState loading={query.isLoading} error={query.error} isEmpty={!query.data?.items.length} empty="No hay resultados para los filtros seleccionados."><ReportTable type={type} rows={query.data?.items||[]}/></DataState>{query.data&&<Pagination page={page} totalPages={query.data.pagination.totalPages} totalItems={query.data.pagination.totalItems} onChange={setPage}/>}</section></main>
}
function ReportTable({type,rows}:{type:ReportType;rows:ReportRow[]}){return <div className="table-scroll"><table><thead><tr><th>Registro</th><th>Cliente / Proyecto</th><th>Vendedor</th><th>Estado / Detalle</th><th>Fecha</th></tr></thead><tbody>{rows.map((item,index)=>{const project=item.projectName||item.name,customer=item.customerName;return <tr key={String(item.projectExternalId||item.customerExternalId||index)}><td><strong>{item.title||item.text||project||customer||labels[type]}</strong><small>{item.description||''}</small></td><td>{item.projectExternalId?<Link to={`/projects?selected=${item.projectExternalId}`}>{project}</Link>:item.customerExternalId?<Link to={`/customers?selected=${item.customerExternalId}`}>{customer}</Link>:'—'}</td><td>{item.sellerName||'—'}</td><td>{item.statusName||('progressPercentage'in item?`${item.progressPercentage}%`:type==='deliveries'?`${item.deliveredQuantity}/${item.totalQuantity}`:'—')}</td><td>{date(item.occurredAtUtc||item.reminderAtUtc||item.committedDateUtc)}</td></tr>})}</tbody></table></div>}
