// R-189 error E2: a non-literal import(name); must name this file and name
export const load = async (name: string): Promise<unknown> => import(name)
