var fs = require('fs');

async function calculateFile(file) {
    const data = await fs.readFileSync(file, 'utf8');
    const lines = data.split("\n");
    const data1 = await manageRequests(lines);

    await fs.writeFile('result.txt', data1.join('\n'), function (err) {
        if (err) throw err;
        console.log('Saved!');
    });
}

async function manageRequests(numbers) {
    const concurrencyLimit = 5;
    let currentIndex = 0;

    const inProgress = [];
    const results = [];

    // Function to process the next request
    async function processNext() {
        if (currentIndex < numbers.length) {
            const number = numbers[currentIndex];
            currentIndex++;
            let requestData = await (await post(number)).json();

            const requestPromise = getValidResult(requestData.request_id);

            inProgress.push(requestPromise);

            requestPromise
                .then((result) => {
                    results.push('requestId: ' + number + ', result: ' + result);
                })
                .catch((error) => {
                    console.error('Error:', error);
                })
                .finally(() => {
                    const index = inProgress.indexOf(requestPromise);
                    if (index !== -1) {
                        inProgress.splice(index, 1);
                    }
                    processNext();
                });
        }
    }

    // Start the initial batch of requests
    for (let i = 0; i < concurrencyLimit; i++) {
        await processNext();
    }

    // Wait for all requests to complete
    while (results.length < numbers.length) {
        await Promise.all(inProgress); // Wait for any request to complete
        await processNext(); // Start a new request
    }

    return results;
}

function post(data) {
    const requestOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data }),
    };

    return fetch('http://35.189.216.103:9005', requestOptions);
}

function get(requestId) {
    return fetch('http://35.189.216.103:9005?request_id=' + requestId)
}

function getValidResult(requestId) {
    return new Promise(async (resolve, reject) => {
        let counterTries = 0;

        const fetchResult = async () => {
            try {
                const response = await get(requestId);

                if (response.status === 200) {
                    const data = await response.json();
                    resolve(data.result);
                } else {
                    counterTries++;
                    setTimeout(fetchResult, 1000);
                }
            } catch (error) {
                if (counterTries < 7) {
                    counterTries++;
                    setTimeout(fetchResult, 1000);
                } else {
                    reject(new Error('Exceeded maximum number of attempts.'));
                }
            }
        };

        setTimeout(fetchResult, 2000);
    });
}

calculateFile('C:/Users/shaked metuky/Desktop/template/input.txt')
