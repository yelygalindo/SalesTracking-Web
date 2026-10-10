import { projectApi } from "../api/projectApi";
import type { ProjectInput } from "../api/projectDtos";
const clean = (x: ProjectInput): ProjectInput => ({
  ...x,
  name: x.name.trim(),
  description: x.description?.trim() || null,
  address: x.address?.trim() || null,
  customerExternalId: x.customerExternalId || null,
  sellerExternalId: x.sellerExternalId?.trim() || null,
});
export const projectService = {
  ...projectApi,
  listOptions: async () => {
    const pageSize = 100;
    const firstPage = await projectApi.list({ page: 1, pageSize });
    const remainingPages = await Promise.all(
      Array.from(
        { length: Math.max(0, firstPage.pagination.totalPages - 1) },
        (_, index) => projectApi.list({ page: index + 2, pageSize }),
      ),
    );
    return [firstPage, ...remainingPages].flatMap((page) => page.items);
  },
  create: (x: ProjectInput) => projectApi.create(clean(x)),
  update: (p: Parameters<typeof projectApi.update>[0], x: ProjectInput) =>
    projectApi.update(p, clean(x)),
};
