## Map Details
These packets are sent by the server to reveal map details

level_chunk
subchunk
network_chunk_publisher_update

## Level Chunk
LevelChunk is sent by the server to provide the client with a chunk of a world data (16xYx16 blocks). Typically a certain amount of chunks is sent to the client before sending it the spawn PlayStatus packet, so that the client spawns in a loaded world.

## Some info about subchunks
The subchunk's y value is the world y-value / 16

to get the x and z value of the subchunk, take the world x and z and divide both by 16
