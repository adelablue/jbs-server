import { Request, Response, NextFunction } from 'express';
import { AuthController } from '../controllers/auth.controller';

export class AuthRoutes {
  authController: AuthController = new AuthController();

  routes(app): void {
    //
    app.route('/oauth/login').post((req: Request, res: Response, next: NextFunction) => {
      // middleware
      // console.log(`Request from: ${req.originalUrl}`);
      // console.log(`Request type: ${req.method}`);
      next();
    }, this.authController.login);

    app.route('/api/auth/login').post(this.authController.loginWithUserNameAndPassword);
  }
}
