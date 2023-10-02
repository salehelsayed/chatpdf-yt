import { auth } from '@clerk/nextjs';
import { redirect } from "next/navigation";
import React from 'react'
import { db } from "@/lib/db";
import { chats } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import ChatSideBar from '@/components/ChatSideBar';
import PDFViewer from '@/components/PDFViewer';
import ChatComponent from '@/components/ChatComponent';
import { checkSubscription } from '@/lib/subscription';


type Props = {
    params: {
      chatId: string;
    };
  };

  const ChatPage = async ({ params: { chatId } }: Props) => {
    //get the userId of the user from Clerk auth()
	const { userId } = await auth();
    //if the user is not authenticated, the user should be directoed to the sign-in page
    if (!userId) {
        return redirect("/sign-in");
    }
    //get the list of chats of the user form the database
    const _chats = await db.select().from(chats).where(eq(chats.userId, userId));
    //if there are no chats at all, redirect the user to `/` to upload his document
    if (!_chats){
        return redirect('/');
    }

    //check if there is no chat with the specified `chatId` in the `_chats` array
    //This means that while the user has some chats, they might be trying to access a chat that doesn't belong to them or doesn't exist.
    if (!_chats.find((chat) => chat.id === parseInt(chatId))) {
        return redirect("/");
    }

    const currentChat = _chats.find(chat => chat.id === parseInt(chatId))
    const isPro = await checkSubscription()

    return (
        <div className="flex max-h-screen overflow-scroll">
            <div className="flex w-full max-h-screen overflow-scroll">
                {/* chat sidebar */}
                <div className="flex-[1] max-w-xs">
                     <ChatSideBar chats={_chats} chatId={parseInt(chatId)} isPro={isPro} />
                </div>
                {/* pdf viewer */}
                <div className="max-h-screen p-4 oveflow-scroll flex-[5]">
                    {/* pdf viewer component*/}
                    <PDFViewer pdf_url={currentChat?.pdfURL || ''} />
                </div>
                 {/* chat component */}
                <div className="flex-[3] border-l-4 border-l-slate-200">
                    {/* chat component compononet*/}
                    <ChatComponent chatId={parseInt(chatId)} />
                </div>
            </div>
        </div>
    )
};

export default ChatPage;