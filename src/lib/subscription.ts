import { auth } from "@clerk/nextjs"
import { db } from "./db"
import { userSubscriptions } from "./db/schema"
import { eq } from "drizzle-orm";

const DAY_IN_MS = 1000 * 60 * 60 * 24;

export const checkSubscription = async () => {
    //check if the user is authenticated
    const {userId} = await auth();
    if(!userId){
        return false
    }
    // get subscription that matches the userId of our user
    const _userSubscriptions = await db.select().from(userSubscriptions).where(eq(userSubscriptions.userId, userId))
    // if there is no record in the database, then the user is not subscribed
    if(!_userSubscriptions[0]){
        return false
    }
    //get the subscription of the user
    const userSubscription = _userSubscriptions[0]

    const isValid = userSubscription.stripePriceId && userSubscription.stripeCurrentPeriodEnd?.getTime()! + DAY_IN_MS > Date.now();

    return !!isValid

}