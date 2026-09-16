import { projectApi } from "../api/projectApi";
import type { ProjectInput } from "../api/projectDtos";
const clean = (x: ProjectInput): ProjectInput => ({
  ...x,
  name: x.name.trim(),
  description: x.description?.trim() || null,
  address: x.address?.trim() || null,
  customerExternalId: x.customerExternalId || null,
  sellerExternalId: x.sellerExternalId || null,
});
export const projectService = {
  ...projectApi,
  create: (x: ProjectInput) => projectApi.create(clean(x)),
  update: (p: Parameters<typeof projectApi.update>[0], x: ProjectInput) =>
    projectApi.update(p, clean(x)),
};
