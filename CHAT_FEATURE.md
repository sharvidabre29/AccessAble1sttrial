# Chat Feature Implementation

## Overview
This document explains the chat feature implementation that allows volunteers and individuals to communicate about service requests.

## Architecture

### Database Schema

#### Conversations Table
- **Purpose**: Manages one-to-one conversations between volunteers and individuals
- **Key Fields**:
  - `id`: UUID primary key
  - `request_id`: References the service request (UNIQUE - one conversation per request)
  - `volunteer_id`: References the volunteer's profile
  - `individual_id`: References the individual requester's profile
  - `created_at`, `updated_at`: Timestamps

#### Messages Table (Enhanced)
- **Key Fields**:
  - `id`: UUID primary key
  - `conversation_id`: References the conversation
  - `sender_id`: ID of the user sending the message
  - `receiver_id`: ID of the user receiving the message
  - `content`: Message text
  - `is_read`: Boolean flag for read status
  - `request_id`: References the service request
  - `created_at`: Timestamp

### Data Flow

```
1. Volunteer clicks "Accept Task" on a request
   ↓
2. Volunteer views accepted task and clicks "Start Chat"
   ↓
3. handleStartChat() in RequestDetails:
   - Verifies task is accepted (both volunteer_id and individual_id exist)
   - Calls getOrCreateConversation() from chatService
   - Conversation is created if it doesn't exist
   - Redirects to /dashboard/volunteer/messages?conversation={id}
   ↓
4. MessagesPage loads:
   - Fetches all conversations for the current user
   - Auto-loads the conversation from URL parameter
   - Subscribes to real-time message updates
   ↓
5. User sends message:
   - Message is inserted into messages table
   - Real-time subscription updates both users
   - Messages are marked as read when viewed
```

## Components & Services

### 1. RequestDetails Component (`src/pages/RequestDetails.tsx`)
**Responsible for**: Initiating chat
- Shows "Start Chat" button when task is assigned to user
- Calls `handleStartChat()` which:
  - Gets/creates conversation using `getOrCreateConversation()`
  - Navigates to messages page with conversation ID
  - Shows toast notifications for errors

### 2. MessagesPage Component (`src/components/shared/MessagesPage.tsx`)
**Responsible for**: Main chat interface
- **Left Panel**: Lists all conversations for current user
- **Right Panel**: Shows messages for selected conversation and input field
- **Features**:
  - Real-time message updates using Supabase subscriptions
  - Auto-scroll to latest messages
  - Mark messages as read on view
  - Send/receive messages with timestamps
  - Loading states and error handling

### 3. Chat Service (`src/pages/chatService.ts`)
**Helper functions**:
- `fetchConversations(userId)`: Get all conversations for a user
- `getOrCreateConversation(requestId, volunteerId, individualId)`: Get existing or create new conversation
- `sendMessage(conversationId, senderId, receiverId, content, requestId)`: Send a message
- `fetchMessages(conversationId)`: Get all messages in a conversation
- `markMessagesAsRead(conversationId, userId)`: Mark messages as read

## User Flows

### Volunteer Flow
1. **Browse Tasks**: Navigate to "Available Requests" or "My Tasks"
2. **Accept Task**: Click on a request and click "Accept Task"
3. **Start Chat**: Once accepted, click "Start Chat" button
4. **Communicate**: Send and receive messages in real-time

### Individual/Requester Flow
1. **Create Request**: Submit a service request
2. **Accept Volunteer**: When a volunteer accepts, conversation can be initiated
3. **View Chat**: Navigate to Messages section to see conversations
4. **Communicate**: Send and receive messages with assigned volunteer

## Row-Level Security (RLS)

### Conversations Policies
- **SELECT**: Users can view conversations they participate in (as volunteer_id OR individual_id)
- **INSERT**: Authenticated users can create conversations
- **UPDATE**: Users can update conversations they participate in

### Messages Policies
- **SELECT**: Users can view messages they sent or received
- **INSERT**: Users can send messages (basic check - more specific via app logic)
- **UPDATE**: Users can mark messages as read (receiver only)

## Real-Time Features

### Message Subscription
- Uses Supabase's PostgreSQL changes feature
- Subscribes to INSERT events on messages table filtered by conversation_id
- Automatically updates message list when new messages arrive
- Auto-scrolls to latest message

## Error Handling

### Toast Notifications
- Chat unavailable until task is accepted
- Error fetching request details
- Error creating/loading conversation
- Unexpected errors with descriptive messages

## Testing Checklist

- [ ] Volunteer can accept a task
- [ ] "Start Chat" button appears after accepting
- [ ] Conversation is created on first chat
- [ ] Existing conversation is reused on subsequent chats
- [ ] Messages are sent and received in real-time
- [ ] Messages are marked as read when viewed
- [ ] User can see all their conversations in the messages list
- [ ] Conversations show correct requester/volunteer names
- [ ] Messages display timestamps
- [ ] Messages are properly styled (sent vs received)
- [ ] Loading states work correctly
- [ ] Error messages display properly
- [ ] Keyboard Enter key sends message

## Future Enhancements

- [ ] Message search functionality
- [ ] Conversation search and filtering
- [ ] Typing indicators
- [ ] Message reactions/emojis
- [ ] File/image sharing
- [ ] Message editing and deletion
- [ ] Message delivery status (sent, delivered, read)
- [ ] Conversation archive/unpin
- [ ] Video call integration
- [ ] Conversation notifications/badges
