import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppConfig } from './app.config';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  const config = app.get(AppConfig);

  // Security headers
  app.use(helmet());

  // CORS — tighten allowed origins in production via env
  const allowedOrigins = config.corsOrigins;
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow same-origin / server-to-server requests (no Origin header)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // OpenAPI
  if (config.nodeEnv !== 'production') {
    const doc = new DocumentBuilder()
      .setTitle('Cross-Connect API')
      .setDescription('Datacenter cross-connect management platform')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, doc);
    SwaggerModule.setup('api/docs', app, document);
    console.log(`OpenAPI docs: http://${config.host}:${config.port}/api/docs`);
  }

  await app.listen(config.port, config.host);
  console.log(`API running on http://${config.host}:${config.port}/api/v1`);
}

bootstrap();
