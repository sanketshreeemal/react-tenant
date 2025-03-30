
Step 1: Install the following shadcn components 
    npx shadcn@latest add input
    npx shadcn@latest add select
    npx shadcn@latest add textarea
    npx shadcn@latest add tooltip
    npx shadcn@latest add scroll-area
    npx shadcn@latest add tabs
    npx shadcn@latest add card
    npx shadcn@latest add sonner


Step 2: Create a temporary test page within the application, call it "temp-test". On the dashboard, have a button on the top right that says "temp-test" that directs the user to the test page.
From now on, use the UI folder and the compoenents installed to build the pages. Avoid custom styling or css unles the component for that is not installed. in that case, note that the component does not exist, and move on. Use the theme.ts file for colour, typography and other avialble styling. 
The test page should have the following elements - 
    - Keep it simple and light weight. Import the dependencies and create a form using the component features downloaded before with the following elements:
        1. Input fields for name and phone number 
        2. drop down listing all the oceans in the world 
        3. A textarea for writing a poem 
        4. a date input for selecting a birthday 
    - goal is to understand if they are working properly, what the default design looks like. Use the theme.ts file to pull in project specific colours and styles. 
    - Add a submit button using the button.tsx file component with a tooltip that shows "Upload data". Use the theme.ts file again for styling. 

Step 3: Add features to the test page under the form using the component features installed
    - Add a tab feature under the form with two tabs - Tab A shows one card with a lorem ipsum title, an icon and some descriptive text. Tab B (content moves across the screen) opens up a a contianer with a scroll area. THe scroll area has a list of 10 names. Make the container small enough that the user can see 4 names and the rest have to be scrolled - effectively testing the functionality of the component. 


Step 4: Create a new statcard.tsx file in the ui folder with all other component files. 
    - Purpose is to standaridize the usage of insight cards across the application isnted of defining them in each page. 
    - The statcard should have the following features as inputs, though not all inputs are mandatory - if not infomration is provided, the card should adjust accordingly. 
        - Title 
        - Value 
        - Icon (from lucide)
        - Subtitle 
    - The statcard should have a general structure that looks like:
        [    import { Card, CardContent } from "@/components/ui/card"
            import { cn } from "@/lib/utils"
            import { LucideIcon } from lucide-react"
            import { useTheme } from "@/theme/theme" // Assuming theme.ts exports a useTheme hook

            interface StatCardProps {
            title: string
            value: string | number
            icon: LucideIcon
            subtitle?: string
            className?: string
            }

            export function StatCard({ title, value, icon: Icon, subtitle, className }: StatCardProps) {
            const theme = useTheme() // Fetch theme variables

            return (
                <Card className={cn("w-[200px] md:w-[250px] lg:w-[300px] p-4 flex flex-col", className)}>
                <CardContent className="flex flex-col space-y-2">
                    {/* Icon */}
                    <Icon size={24} {icon-code} />

                    {/* Title & Value */}
                    <div>
                    <h3 className={cn("text-lg font-bold", theme.statCard.titleColor)}>{title}</h3>
                    <p className={cn("text-2xl font-semibold", theme.statCard.valueColor)}>{value}</p>
                    </div>

and so on......
        ]

    - Then we update the theme.ts file with our variables that could look something like 
        statCard: {
        titleColor: "text-gray-900 dark:text-gray-200",
        valueColor: "text-blue-500 dark:text-blue-400",
        subtitleColor: "text-gray-500 dark:text-gray-400"
        ....
        }

    These snippets above are jsut structures that should give you direction on how i am thinking of building this out. Use the structure, complete the code with what we actually need to fully finish the statcontainer. I want it to have more rounded edges ans soft but very subtle shadows as well, if that is not already defined. 

Step 5: Implement Changes to the Dashbaord Page.tsx
    - I think it is completely possible to change the mobile layout to have the property card on top, across the screen while two square-ish cards underneath. lets change the phone grid to look more like the image ive sttached. a 2X1 box on the top, followed by two 1X1 boxed beneath that to fill up the screen. Make sure that the components are dynamic out of the box, and can be adapted as such. Make the infomration much more compact - right now there is too much white space for the sake of screen size. Fix that on the page as well. While we are restructuring the stat cards, make these specific stat cards very beautiful - dont play too much with the colours, but make them incredibly appealing as they are the first thing a user sees. 
    - On the properties card, instead of showing the occupancy rate as the subtitle, show the split between ho wmany commercial and how many residential properties there are, with a line break. 

    - Move the occupancy statistic to the vacancy card. Rename the Vacancy card to Occupancy. THe Value shoulk be the vacancy percentage and the subtitble should be the unmber value (example - "7/10 occupied now"). Functions to collect and calcualte the infomration should already exist on the @page.tsx , but if they dont, flag them as missing and skip this step to move on the the rest of the instructions ive given you. 

    - Once that is done, i want you to make two changes to the lease and rent collection contianers. For desktop - move the rent collection container to the left of the screen and the lease expiry container to the right. Both of these contianers should be using the card component established in @card.tsx instead of custom styling. Further to that, both containers should have @scroll-area.tsx embedded so that the user can scroll through.

    - On mobile, i want to implement @tabs.tsx so that a user can switch between looking at rental payments (tab 1) and lease expirations (tab 2). Make sure the data is in card compoennts and has scroll-area enabled as well. 

    - use components for everything, do not recreate code. Once the changes are made, ensure all old css code is removed from the file to ensure no bloat and increase speed and readibliity of the code. 


Issues - is the @theme.ts file correctly optimized to provide the variables to the statcard.tsx file? There may be variables defined that no longer are in use by the statcard file. 