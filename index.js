function SQLEngine(database){
    this.database = database;
  
    this.execute = function(query){
        let parsedQuery = this.parseQuery(query.replace(/\'/g, '').split(' '));
        return this.getData(parsedQuery)
    }
  
    this.parseQuery = arrStr => {
        let selectArr = [], fromStr = '', joinArr = [], onArr = [], whereArr = [];
        try {
            /*Take SELECT from string*/
            while (1) {
                if (arrStr[0].toUpperCase() === 'SELECT') {
                    if (arrStr[1][arrStr[1].length-1] === ',') {
                        selectArr.push(arrStr[1].replace(',', ''))
                        arrStr.splice(1, 1);
                    } else {
                        selectArr.push(arrStr[1])
                        arrStr.splice(0, 2)
                        break;
                    }
                } else throw 'Invalid SQL input'; 
            }

            /*Take FROM from string*/
            if (arrStr[0].toUpperCase() === 'FROM') {
                fromStr = arrStr[1];
                arrStr.splice(0, 2);
            } else throw 'Invalid SQL input'

            /*Take JOIN from string*/
            while (arrStr.length !== 0) {
                if (arrStr[0].toUpperCase() === 'JOIN') {
                    joinArr.push(arrStr[1]);
                    onArr.push([arrStr[3], arrStr[4], arrStr[5]]);
                    arrStr.splice(0, 6);
                } else break;
            }

            /*Take WHERE from string*/
            if (arrStr.length !== 0 && arrStr[0].toUpperCase() === 'WHERE') {
                whereArr = [...arrStr.slice(1)]
                arrStr.splice(0)
            }

            if (whereArr.length > 3) {
                whereArr[2] = whereArr.slice(2).join(' ')
                whereArr.splice(3);
            }

            if (arrStr.length !== 0) throw 'Invalid SQL input';
            /*return Object with parsed string*/
            return {select: selectArr, from: fromStr, join: joinArr, on: onArr, where: whereArr}
        } catch (e) {
            return e;
        }
    }
  
    this.getData = query => {
        let resultArr = [];
        //Main table baised on FROM query
        let fromArray = [...this.database[query.from]];
        this.modifyTableKeys(fromArray, query.from);
        /*Join additional tabels to main table*/
        if (query.join.length !== 0) {
            let joinArray;
            for (let i = 0; i < query.join.length; i++) {
                joinArray = [...this.database[query.join[i]]];
                this.modifyTableKeys(joinArray, query.join[i]);
                fromArray = this.joinTable(fromArray, joinArray, query.on[i]);
            }
        }
      
        //Check WHERE query
        if (query.where.length !== 0) {
            for (let i = 0; i < fromArray.length; i++) {
                if(!this.conditionCheck(fromArray[i], query.where)) {
                    fromArray.splice(i, 1)
                    i--;
                }
            }
        }
  
      //implement SELECT query accordingly to table names order in SELECT query
        for (let i = 0, j = 0;; i++) {
            if (i >= fromArray.length) {
                i = 0;
                j++;
            }
            if (j >= query.select.length) break;
            if(fromArray[i][query.select[j]]) {
                //In case resultArr is empty
                if (resultArr[i] === undefined) {
                    let obj = {};
                    Object.assign(obj, {[query.select[j]]: fromArray[i][query.select[j]]})
                    resultArr.push(obj);
                } else Object.assign(resultArr[i], {[query.select[j]]: fromArray[i][query.select[j]]})
            }
        }
        return resultArr
    }
  
    //Change basic JS object keys to SQL table keys
    this.modifyTableKeys = (arr, tableName) => {
        for (let i = 0; i < arr.length; i++) {
            for (let prop in arr[i]) arr[i] = renameKey(arr[i], prop, `${tableName}.${prop}`)
        }
    }
  
    
    this.conditionCheck = (obj, whereArr) => {
        //Bad solution for avoiding "man's" like strings
        let str = obj[whereArr[0]]
        if (typeof(str) === "string") str = str.replace(/\'/g, '');
  
        switch (whereArr[1]) {
        case '=':
            return (str == whereArr[2])
        case '>':
            return (str > whereArr[2])
        case '<':
            return (str < whereArr[2])
        case '<=':
            return (str <= whereArr[2])
        case '>=':
            return (str >= whereArr[2])
        case '<>':
            return (str != whereArr[2])
        default:
            return false
        }
    }
  
    /* Join additional table to main table */
    this.joinTable = (mainArr, addArr, conditionArr) => {
        let arr = [];
        //Set ON query to 'mainArrCondition = addArrCondition'
        if (mainArr[0][conditionArr[0]] === undefined) conditionArr.reverse()
        mainArr.sort((a, b) => a[conditionArr[0]] - b[conditionArr[0]]);
        for(let i = 0, flag = 0; i < mainArr.length; i++) {
            for (let j = 0; j < addArr.length; j++) {
                let obj1, obj2;
                if(mainArr[i][conditionArr[0]] === addArr[j][conditionArr[2]]) {
                obj1 = clone(mainArr[i])
                obj2 = clone(addArr[j])
                arr.push(Object.assign(obj1, obj2))
                flag++;
                }
            }
            //In case there is none matches
            if (!flag) mainArr.splice(i, 1)
            else flag = 0;
        }
        return arr;
    }
}

const renameKey = (object, key, newKey) => {
    const clonedObj = clone(object);
    const targetKey = clonedObj[key];
    delete clonedObj[key];
    clonedObj[newKey] = targetKey;
    return clonedObj;
};

const clone = (obj) => Object.assign({}, obj);