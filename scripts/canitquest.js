// SETTINGS
const MAX_RESULTS = 60


async function loadItemData()
{
    const cachedData = localStorage.getItem('cachedItemData');
    const cachedTimestamp = localStorage.getItem('cachedTimestamp');
    const currentTime = new Date().getTime();

    if (cachedData && cachedTimestamp && currentTime - cachedTimestamp < 24 * 60 * 60 * 1000)
    {
        console.log(cachedData)
        return JSON.parse(cachedData);
    }

    let fetch1 = await fetch('https://api.tarkov.dev/graphql', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify({
            query: `{
    items {
        id
    }
}`})
    })

    let data = await fetch1.json()
    let idsmap = data['data']['items']
    let idslist = []
    for (let index in idsmap)
    {
        idslist.push(idsmap[index]['id'])
    }

    let fetch2 = await fetch('https://api.tarkov.dev/graphql', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify({
            query: `{
    items(ids: ["` + idslist.join('","') + `"]) {
        name
        id
        gridImageLink
    }
}`})
    })
    data = await fetch2.json()
    let itemsMap = data['data']['items']
    itemsMap.sort((a, b) => a.name.localeCompare(b.name));

    localStorage.setItem('cachedItemData', JSON.stringify(itemsMap));
    localStorage.setItem('cachedTimestamp', currentTime);

    console.log(JSON.parse(JSON.stringify(itemsMap)))
    itemsMap = JSON.parse(JSON.stringify(itemsMap))
    return itemsMap
}

async function isUsedInQuest(id)
{
    let fetch2 = await fetch('https://api.tarkov.dev/graphql', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify({
            query: `{
    item(id: "` + id + `")
  {
    usedInTasks
    {
      id
      name
    }
  }
}`})
    })
    let data = await fetch2.json()
    let itemsMap = data['data']['item']['usedInTasks']
    return itemsMap
}

function searchAlphaSortedMap(itemMap, target)
{
    let left = 0;
    let right = itemMap.length - 1;
    let resultIndex = -1

    while (left <= right)
    {
        const mid = Math.floor((left + right) / 2);
        let itemname = itemMap[mid]['name'].toLowerCase()

        if (itemname.indexOf(target.toLowerCase()) == 0)
        {
            resultIndex = mid;
            right = mid - 1;
        } else if (itemname < target)
        {
            left = mid + 1;
        } else
        {
            right = mid - 1;
        }
    }

    if (resultIndex == -1)
    {
        return []
    }
    else
    {
        let resultArray = []
        let i = resultIndex
        while (itemMap[i]['name'].toLowerCase().indexOf(target.toLowerCase()) == 0)
        {
            resultArray.push(itemMap[i])
            i++
        }
        return resultArray
    }
}

let input = document.getElementById('input')
let gridContainer = document.getElementById('grid-container')
let tooltip = document.createElement('div')
let itemElementMap = new Map()
tooltip.className = "custom-tooltip"
document.body.appendChild(tooltip)
let itemsMap = await loadItemData()
window.onload = function () 
{
    loadItemsInDOM()
    loadRelevantItems('a')

    input.addEventListener('input', function ()
    {
        loadRelevantItems(input.value)

    })
}

function clearGrid()
{
    let hidden = document.getElementById('hidden-grid-elements')
    if (gridContainer.children.length > 0)
    {
        for (let index in gridContainer.children)
        {
            let element = gridContainer.children[index]
            if (element instanceof HTMLElement)
            {
                // console.log(hidden)
                // console.log(element)

                hidden.appendChild(element)
            }
        }
    }
    gridContainer.innerHTML = ""
}

function loadItemsInDOM()
{
    for (let index in itemsMap)
    {
        let item = itemsMap[index]

        let element = document.createElement('div')
        element.className = 'grid-element'
        element.setAttribute('itemname', item['name'])
        element.setAttribute('itemid', item['id'])

        let pic = document.createElement('img')
        document.body.appendChild(pic)
        pic.className = 'grid-image'
        pic.src = item['gridImageLink']

        element.appendChild(pic);
        gridContainer.appendChild(element);
        if (index == itemsMap.length - 1 || index == MAX_RESULTS - 1)
        {

            pic.addEventListener('load', function ()
            {
                updateGridItemSizes();
            });
        }

        element.addEventListener('mouseover', (event) =>
        {
            event.stopPropagation()
            tooltip.style.color = ''
            tooltip.innerHTML = item['name']
            const mouseX = event.clientX;
            const mouseY = event.clientY;
            tooltip.style.left = mouseX + 5 + 'px';
            tooltip.style.top = mouseY + 'px';

            tooltip.style.visibility = 'visible';
            tooltip.style.opacity = '1';
        })

        element.addEventListener('mouseout', (event) =>
        {
            event.stopPropagation()
            const tooltip = document.querySelector('.custom-tooltip');
            tooltip.style.color = ''
            tooltip.style.visibility = 'hidden';
            tooltip.style.opacity = '0';
        });
        element.addEventListener('click', async (event) =>
        {
            let query = await isUsedInQuest(element.getAttribute('itemid'))
            let questArray = []
            for (index in query)
            {
                questArray.push(query[index]['name'])
            }
            tooltip.innerHTML = 'Quests: ' + questArray.join(', ')
            if (questArray.length > 0)
            {
                tooltip.style.color = '#2dee35'
            }
            else
            {
                tooltip.style.color = '#e90b2a'
            }
        })
        itemElementMap[item['id']] = element
        gridContainer.appendChild(element)
    }
}

function loadRelevantItems(query)
{
    if (query != '')
    {
        let items = searchAlphaSortedMap(itemsMap, query)
        clearGrid()
        for (let index in items.slice(0, MAX_RESULTS))
        {
            let item = items[index]

            let element = itemElementMap[item['id']]
            gridContainer.appendChild(element)

        }
        updateGridItemSizes()
    }

}


function updateGridItemSizes()
{
    const gridItems = gridContainer.children
    for (let index in gridItems)
    {
        let item = gridItems[index]
        if (item instanceof HTMLElement)
        {
            item.style.display = 'block'
            const rect = item.getBoundingClientRect();

            console.log(item.clientHeight, rect.width)
            const gridColumnSpan = Math.ceil(item.clientWidth / (64 + 10));
            const gridRowSpan = Math.ceil(item.clientHeight / (64 + 10));

            item.style.gridRow = `span ${gridRowSpan}`;
            item.style.gridColumn = `span ${gridColumnSpan}`;
        }
    }
}
