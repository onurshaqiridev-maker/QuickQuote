/** Helpers so every successful response has the same shape: { data } or { data, meta }. */
import type { Response } from 'express';
import type { Page } from '../models/dto/page.dto';

export function sendData<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ data });
}

export function sendPage<T>(res: Response, page: Page<T>): void {
  res.status(200).json({
    data: page.items,
    meta: { page: page.page, pageSize: page.pageSize, total: page.total },
  });
}
