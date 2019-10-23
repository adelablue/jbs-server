import { Request, Response, NextFunction } from 'express';
import { EventsController } from '../controllers/events.controller';
import { verifyToken } from '../middleware/verifyToken';
import permit from '../middleware/permission.middleware';

export class EventsRoutes {
  eventsController: EventsController = new EventsController();

  routes(app): void {
    app.route('/events/calendar/:date').get(this.eventsController.getEventsByDate);
    app.route('/events/get-events-count-by-date').get(this.eventsController.getEventsCountByDate);
    app.route('/events/price-schema').get(this.eventsController.getPriceWeeklySchema);
    app.route('/events/discount-rules').get(verifyToken, this.eventsController.getDiscountRules);

    // This is api to go through all events and update status if it's expired or complete
    app.route('/events/update-status').post(verifyToken, this.eventsController.updateStatus);
    app
      .route('/events')
      .get(this.eventsController.getEvents)
      // .get((req: Request, res: Response, next: NextFunction) => {
      //   // middleware
      //   console.log(`Request from: ${req.originalUrl}`);
      //   console.log(`Request type: ${req.method}`);
      //   next();
      // }, this.eventsController.getEvents)
      .post(verifyToken, permit({ domain: 'event', operations: ['create'] }), this.eventsController.addEvent);
    app.route('/events/:scriptId/:shopId').get(this.eventsController.getEventsByScriptAndShop);
    app.route('/events/:scriptId/:shopId/discount-rules').get(this.eventsController.getEventDiscountRolesByScriptAndShop);
    app.route('/events/:scriptId/:shopId/available-discount-rules').get(verifyToken, this.eventsController.getAvailableDiscountRules);
    app
      .route('/events/:eventId')
      .get(verifyToken, this.eventsController.getEventDetails)
      .put(verifyToken, permit({ domain: 'event', operations: ['update'] }), this.eventsController.updateEvent);
    app.route('/events/:eventId/join').post(verifyToken, permit({ domain: 'event-user', operations: ['create'] }), this.eventsController.joinUserEvent);
    // ppl can cancel his own booking, host can cancel others booking, when host cancel booking, he has option to blacklist a person
    app.route('/events/:eventId/users/cancel').put(verifyToken, permit({ domain: 'event-user', operations: ['update'] }), this.eventsController.cancelEventUser);
    // only host can update payment data
    app.route('/events/:eventId/users/update-status').put(verifyToken, permit({ domain: 'event-user', operations: ['update'] }), this.eventsController.updateEventUserStatus);

    app.route('/events/:eventId/cancel').put(verifyToken, permit({ domain: 'event', operations: ['update'] }), this.eventsController.cancelEvent);
    app.route('/events/:eventId/complete').put(verifyToken, permit({ domain: 'event', operations: ['update'] }), this.eventsController.completeEvent);
  }
}
