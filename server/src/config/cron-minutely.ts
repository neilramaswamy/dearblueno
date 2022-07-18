import cron from "node-cron";
import User, { IUpcomingEventNotification } from "../models/User";
import Event from "../models/Event";
import log4js from "log4js";

const logger = log4js.getLogger("cron-minutely");
let timeTaken = [] as number[];

export default async function setupCron() {
  // Every minute, handle notifications for events
  cron.schedule("* * * * *", async () => {
    const startDate = new Date();

    await minutelyJob();

    const endDate = new Date();
    const completedIn = endDate.getTime() - startDate.getTime();
    logger.info(`Completed in ${completedIn}ms`);

    timeTaken.push(completedIn);
    if (timeTaken.length > 60) {
      timeTaken.shift();
    }
    logger.info(
      `Minutely cron job took an average of ${
        timeTaken.reduce((a, b) => a + b, 0) / timeTaken.length
      } for the past hour.`
    );
  });
}

export async function minutelyJob() {
  // Send notifications to users that have an upcoming event
  const events = await Event.find({
    $and: [
      { notificationSent: false },
      { startDate: { $lte: new Date(Date.now() + 60 * 60 * 1000) } },
    ],
  });

  for (const event of events) {
    const usersToNotify = event.interested.concat(event.going);
    const notification: IUpcomingEventNotification = {
      timestamp: new Date(),
      type: "upcomingEvent",
      content: {
        eventId: event._id,
        eventName: event.eventName,
        location: event.location,
        startDate: event.startDate,
        endDate: event.endDate,
      },
    };

    await User.updateMany(
      { _id: { $in: usersToNotify } },
      {
        $push: {
          notifications: notification,
        },
      }
    );

    await Event.updateOne({ _id: event._id }, { notificationSent: true });
  }
}