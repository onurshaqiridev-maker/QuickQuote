import type { Request, Response } from 'express';
import * as categoryService from '../../../services/category.service';
import { sendData } from '../../responses';

export async function listCategories(_req: Request, res: Response): Promise<void> {
  sendData(res, await categoryService.listActiveCategories());
}
