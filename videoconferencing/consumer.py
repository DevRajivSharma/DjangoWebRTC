from channels.generic.websocket import AsyncWebsocketConsumer
import json
class mysocket(AsyncWebsocketConsumer):

    async def connect(self):
        self.group_name = 'test-room'
        await self.channel_layer.group_add(self.group_name,self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        print(f'Disconnecting with code: {code}')
        await self.channel_layer.group_discard(self.group_name,self.channel_name)
        
    async def receive(self,text_data):

        receive_dict = json.loads(text_data)
        message = receive_dict['message']
        action = receive_dict['action']

        if(action == 'new-offer') or (action == 'new-answer'):
            
            
            receiver_channel_name = receive_dict['message']['receiver_channel_name']
            await self.channel_layer.send(
                receiver_channel_name,

                 {
                    'type' : 'send.sdp',
                    'receive_dict' : receive_dict
                 }
            )

        receive_dict['message']['receiver_channel_name'] = self.channel_name

        await self.channel_layer.group_send(
            self.group_name,
            {
                'type' : 'send.sdp',
                'receive_dict' : receive_dict
            }
        )

    
    async def send_sdp(self,event):
        receive_dict = event['receive_dict']

        await self.send(text_data=json.dumps(receive_dict))



# async def connect(self):
#         await self.accept()
#         await self.send(text_data=json.dumps({
#             'message': 'Hello, WebSocket!'
#         }))

#     async def disconnect(self, code):
#         pass

#     async def receive(self, text_data):
#         pass