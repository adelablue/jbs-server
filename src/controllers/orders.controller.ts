import { Request, Response, NextFunction } from 'express';
import OrdersRepo from '../repositories/orders.repository';
import OrderService from '../services/order.service';
import { InvalidRequestException, ResourceAlreadyExist, ResourceNotFoundException, AccessDeinedException, OrderCannotPayException } from '../exceptions/custom.exceptions';
import { BaseController } from './base.controller';
import logger from '../utils/logger';

export class OrdersController extends BaseController {
  getOrders = async (req: Request, res: Response, next: NextFunction) => {};

  payOrder = async (req: Request, res: Response, next: NextFunction) => {
    const {
      loggedInUser: { id: loggedInUserId }
    } = res.locals;
    const { orderId } = req.params;
    const order = await OrdersRepo.findById(orderId);
    if (!order) {
      next(new ResourceNotFoundException('Order', orderId));
      return;
    }
    const {
      status,
      createdBy: { id: createdByUserId }
    } = order;
    if (status != 'created') {
      next(new OrderCannotPayException(orderId));
      return;
    }
    // console.log(loggedInUserId);
    // console.log(createdByUserId);
    if (loggedInUserId != createdByUserId) {
      next(new AccessDeinedException(loggedInUserId, `You can only pay your own order`));
      return;
    }

    try {
      const response = await OrderService.wechatPay(order);
      // console.log('ssss' + response);
      res.json({ code: 'SUCCESS', data: response });
    } catch (err) {
      console.log(err);
      next(err);
    }
  };

  confirmWechatPayment = async (req: Request, res: Response, next: NextFunction) => {
    logger.info(`wechat payment notify ${req}`);
    res.json({ code: 'SUCCESS' });
  };

  queryPaymentStatus = async (req: Request, res: Response, next: NextFunction) => {
    const { loggedInUser } = res.locals;
    const { orderId } = req.params;
    const order = await OrdersRepo.findById(orderId);
    if (!order) {
      next(new ResourceNotFoundException('Order', orderId));
      return;
    }

    try {
      const response = await OrderService.queryPaymentStatus(order);
      res.json({ code: 'SUCCESS', data: response });
    } catch (err) {
      console.log(err);
      next(err);
    }
  };
}
