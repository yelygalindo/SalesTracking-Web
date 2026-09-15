export interface ProjectSummary { id:number; externalId:string; name:string; description:string|null; customerExternalId:string|null; customerName:string|null; sellerExternalId:string; sellerName:string; status:string; estimatedAmount:number|null; startDateUtc:string|null; expectedCloseDateUtc:string|null; progressPercentage:number; actualCloseDateUtc:string|null; address:string|null; latitude:number|null; longitude:number|null; createdAtUtc:string }
export interface ProjectDetail extends ProjectSummary { updatedAtUtc:string }
export interface ProjectInput { name:string; description:string|null; customerExternalId:string|null; sellerExternalId:string|null; estimatedAmount:number|null; startDateUtc:string|null; expectedCloseDateUtc:string|null; progressPercentage:number|null; actualCloseDateUtc:string|null; address:string|null; latitude:number|null; longitude:number|null }
export interface ProjectStatus { value:number; label:string }
export interface Paged<T> { items:T[]; pagination:{page:number;pageSize:number;totalItems:number;totalPages:number} }
export interface Material { productExternalId:string; productName:string; unit:string; committedQuantity:number; deliveredQuantity:number; pendingQuantity:number }
export interface Attachment { id:number; externalId:string; fileName:string; contentType:string; sizeBytes:number; attachmentType:string; caption:string|null; isCover:boolean; downloadUrl:string; uploadedByUserName:string; createdAtUtc:string; visitExternalId:string|null }
export interface AttachmentOptions { maxFileSizeBytes:number; attachmentTypes:{value:string;label:string;description:string}[]; acceptedFormats:{description:string;extensions:string[];contentTypes:string[]}[] }
export interface AttachmentUpload { file:File; attachmentType:string; caption:string; isCover:boolean; visitExternalId:string; occurredAtUtc:string }
export interface TimelineItem { externalId:string; eventTypeName:string; title:string; description:string|null; occurredAtUtc:string; createdBy:{externalId:string;name:string|null}|null }
export interface ProjectNote { externalId:string; content:string; createdBy:{name:string|null}|null; occurredAtUtc:string }
export interface ProjectReminder { externalId:string; text:string; reminderAtUtc:string; assignedTo:{name:string|null}; completed:boolean }
export interface ProjectVisit { externalId:string; projectExternalId:string|null; projectName:string|null; customerExternalId:string|null; customerName:string|null; visitedAtUtc:string; checkOutAtUtc:string|null; notes:string|null; result:string|null; sellerName:string }
