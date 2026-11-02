import type { Request, Response } from 'express';
import { categoryInputSchema } from '../../../models/requests/admin.requests';
import { idParamsSchema } from '../../../models/requests/common.requests';
import * as adminCategoryService from '../../../services/admin-category.service';
import { currentUser } from '../../middleware/authenticate';
import { sendData } from '../../responses';
import { parseRequest } from '../../validation';

export async function listCategories(_req: Request, res: Response): Promise<void> {
  sendData(res, await adminCategoryService.listCategories());
}

export async function createCategory(req: Request, res: Response): Promise<void> {
  const input = parseRequest(categoryInputSchema, req.body);
  sendData(res, await adminCategoryService.createCategory(currentUser(req).id, input), 201);
}

export async function updateCategory(req: Request, res: Response): Promise<void> {
  const { id } = parseRequest(idParamsSchema, req.params);
  const input = parseRequest(categoryInputSchema, req.body);
  sendData(res, await adminCategoryService.updateCategory(currentUser(req).id, id, input));
}

export async function deleteCategory(req: Request, res: Response): Promise<void> {
  const { id } = parseRequest(idParamsSchema, req.params);
  await adminCategoryService.deleteCategory(currentUser(req).id, id);
  res.status(204).end();
}
