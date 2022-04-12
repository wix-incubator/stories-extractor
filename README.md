# Stories-Extractor
This little package helps you to fetch all the stories from a given storybook statics files.

It works in the same way as storybook extract function, but it have 2 major benefits:
1. It support storybook at version 5
2. It does not require you to install storybook and all of its dependencies only the minimum to activate it

## How to activate it?
 just call this script with 2 parameters the first should be the location of the storybook statics files and the second one is the location for the output file
 ```
    stories-extractor storybook-static storybook-static/stories.json
 ``` 

 Hope you will find it useful 