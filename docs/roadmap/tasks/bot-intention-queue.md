# bot-intention-queue
A useful bot will need to be able to plan a set of actions where some or all actions
need to happen at a pace that requires knowledge of world state, how much time has
passed since the last action, or both. We currently have a Queue class concept, but
there is not a generalizable concept of an item in the queue being done based on
time or world state.

