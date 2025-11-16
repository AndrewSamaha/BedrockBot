# Event-driven architecture
Move toward an event-driven architecture where components create
events and other components react to those events. There will
be an event bus and different components publish and subscribe
to the events in the bus. E.g., When the world time shifts to night, that might create a sunset event, and maybe there's a behavior that has subscribed to that event that triggers the bot to go
to sleep.

